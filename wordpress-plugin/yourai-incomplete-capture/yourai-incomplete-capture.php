<?php
/**
 * Plugin Name: YourAI Seller Connect
 * Description: Connects your WooCommerce store to YourAI Seller — captures unfinished checkouts into the Incomplete tab and blocks fraud orders (phone/IP/email) via Order Guard.
 * Version: 1.5.0
 * Author: YourAI Seller
 *
 * No coding needed: install, activate, paste your Business ID + API Key, done.
 */

if (!defined('ABSPATH')) {
    exit; // never run outside WordPress
}

/**
 * The dashboard "Download plugin" button bakes these in automatically. If they
 * are left as placeholders, the seller pastes them on the settings page below.
 */
if (!defined('YOURAI_CAPTURE_ENDPOINT')) {
    define('YOURAI_CAPTURE_ENDPOINT', 'https://app.youraiseller.com/api/incomplete-capture');
}
if (!defined('YOURAI_GUARD_ENDPOINT')) {
    define('YOURAI_GUARD_ENDPOINT', 'https://app.youraiseller.com/api/order-guard/check');
}
define('YOURAI_PLUGIN_VERSION', '1.5.0');
define('YOURAI_PLUGIN_SLUG', 'yourai-incomplete-capture');
if (!defined('YOURAI_UPDATE_INFO')) {
    define('YOURAI_UPDATE_INFO', 'https://app.youraiseller.com/api/plugin/update-info');
}

/* ---- Auto-update (sellers get updates like any normal plugin) ---------- */
function yourai_fetch_update_info() {
    $cached = get_transient('yourai_update_info');
    if (is_array($cached)) return $cached;
    $res = wp_remote_get(YOURAI_UPDATE_INFO, array('timeout' => 6));
    if (is_wp_error($res) || (int) wp_remote_retrieve_response_code($res) !== 200) return null;
    $data = json_decode(wp_remote_retrieve_body($res), true);
    if (!is_array($data) || empty($data['version'])) return null;
    set_transient('yourai_update_info', $data, 6 * HOUR_IN_SECONDS);
    return $data;
}

add_filter('pre_set_site_transient_update_plugins', function ($transient) {
    if (!is_object($transient) || empty($transient->checked)) return $transient;
    $info = yourai_fetch_update_info();
    if (!$info) return $transient;
    $basename = plugin_basename(__FILE__);
    $current = isset($transient->checked[$basename]) ? $transient->checked[$basename] : YOURAI_PLUGIN_VERSION;
    if (version_compare($info['version'], $current, '>')) {
        $obj = new stdClass();
        $obj->slug = YOURAI_PLUGIN_SLUG;
        $obj->plugin = $basename;
        $obj->new_version = $info['version'];
        $obj->package = $info['download_url'];
        $obj->url = isset($info['homepage']) ? $info['homepage'] : 'https://youraiseller.com';
        $obj->tested = isset($info['tested']) ? $info['tested'] : '';
        $transient->response[$basename] = $obj;
    }
    return $transient;
});

add_filter('plugins_api', function ($result, $action, $args) {
    if ($action !== 'plugin_information') return $result;
    if (!isset($args->slug) || $args->slug !== YOURAI_PLUGIN_SLUG) return $result;
    $info = yourai_fetch_update_info();
    if (!$info) return $result;
    $res = new stdClass();
    $res->name = $info['name'];
    $res->slug = YOURAI_PLUGIN_SLUG;
    $res->version = $info['version'];
    $res->author = 'YourAI Seller';
    $res->homepage = isset($info['homepage']) ? $info['homepage'] : 'https://youraiseller.com';
    $res->download_link = $info['download_url'];
    $res->requires = isset($info['requires']) ? $info['requires'] : '5.5';
    $res->tested = isset($info['tested']) ? $info['tested'] : '6.6';
    $res->last_updated = isset($info['last_updated']) ? $info['last_updated'] : '';
    $res->sections = array('description' => isset($info['description']) ? $info['description'] : '');
    return $res;
}, 10, 3);

// Refresh the cached manifest right after an update so the notice clears.
add_action('upgrader_process_complete', function ($upgrader, $options) {
    if (isset($options['action'], $options['type']) && $options['action'] === 'update' && $options['type'] === 'plugin') {
        delete_transient('yourai_update_info');
    }
}, 10, 2);
define('YOURAI_BAKED_BUSINESS_ID', '__YOURAI_BUSINESS_ID__');
define('YOURAI_BAKED_API_KEY', '__YOURAI_API_KEY__');

function yourai_baked($value, $marker) {
    return ($value && strpos($value, $marker) === false) ? $value : '';
}
function yourai_business_id() {
    $baked = yourai_baked(YOURAI_BAKED_BUSINESS_ID, 'YOURAI_BUSINESS_ID');
    return $baked ?: trim((string) get_option('yourai_business_id', ''));
}
function yourai_api_key() {
    $baked = yourai_baked(YOURAI_BAKED_API_KEY, 'YOURAI_API_KEY');
    return $baked ?: trim((string) get_option('yourai_api_key', ''));
}

/* ---- Branded settings page (top-level "YourAI Seller" menu) ------------- */
add_action('admin_menu', function () {
    add_menu_page(
        'YourAI Seller Connect',
        'YourAI Seller',
        'manage_options',
        'yourai-capture',
        'yourai_capture_settings_page',
        'dashicons-cart',
        58
    );
});
add_action('admin_init', function () {
    register_setting('yourai_capture', 'yourai_business_id');
    register_setting('yourai_capture', 'yourai_api_key');
    register_setting('yourai_capture', 'yourai_order_guard');
});
function yourai_capture_settings_page() {
    $businessId = esc_attr(get_option('yourai_business_id', ''));
    $apiKey = esc_attr(get_option('yourai_api_key', ''));
    $connected = yourai_business_id() && yourai_api_key();
    $guardOn = get_option('yourai_order_guard', '1') === '1';
    ?>
    <div class="wrap yai-wrap">
      <style>
        .yai-wrap{max-width:920px}
        .yai-wrap *{box-sizing:border-box}
        .yai-hero{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 60%,#4338ca 100%);border-radius:18px;color:#fff;padding:28px 30px;margin:18px 0 4px;position:relative;overflow:hidden}
        .yai-hero::after{content:"";position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:rgba(255,255,255,.08);border-radius:50%}
        .yai-hero .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;position:relative;z-index:1}
        .yai-hero h1{color:#fff;font-size:23px;margin:0 0 6px;display:flex;align-items:center;gap:10px;font-weight:800}
        .yai-hero p{margin:0;opacity:.92;font-size:13px;max-width:560px}
        .yai-pill{display:inline-flex;align-items:center;gap:7px;margin-top:16px;background:rgba(255,255,255,.18);padding:7px 14px;border-radius:999px;font-weight:700;font-size:12px}
        .yai-dot{width:9px;height:9px;border-radius:999px;background:#fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,.25)}
        .yai-dot.on{background:#34d399;box-shadow:0 0 0 4px rgba(52,211,153,.25)}
        .yai-dash{display:inline-flex;align-items:center;gap:7px;background:#fff;color:#4f46e5;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap}
        .yai-dash:hover{color:#4338ca}
        .yai-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px 24px;margin-top:16px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
        .yai-card h2{margin:0 0 4px;font-size:15px;font-weight:800;color:#0f172a}
        .yai-card .sub{color:#64748b;font-size:12px;margin:0 0 16px}
        .yai-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:782px){.yai-grid{grid-template-columns:1fr}}
        .yai-field label{display:block;font-weight:700;font-size:12px;color:#334155;margin-bottom:6px}
        .yai-field input{width:100%;height:44px;border:1px solid #d1d5db;border-radius:10px;padding:0 12px;font-size:14px;font-family:ui-monospace,Menlo,monospace}
        .yai-field input:focus{border-color:#7c3aed;outline:none;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
        .yai-field .hint{color:#94a3b8;font-size:11px;margin-top:5px}
        .yai-feat{display:flex;gap:14px;align-items:flex-start;padding:16px;border:1px solid #eef2f7;border-radius:12px;background:#fafbff}
        .yai-feat .ic{flex:0 0 auto;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff}
        .yai-feat .ic.cap{background:linear-gradient(135deg,#10b981,#059669)}
        .yai-feat .ic.grd{background:linear-gradient(135deg,#f43f5e,#e11d48)}
        .yai-feat .ic .dashicons{font-size:21px;width:21px;height:21px}
        .yai-feat h3{margin:0 0 3px;font-size:13.5px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px}
        .yai-feat p{margin:0;font-size:12px;color:#64748b;line-height:1.5}
        .yai-badge{font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px}
        .yai-badge.on{background:#dcfce7;color:#15803d}
        .yai-badge.off{background:#fee2e2;color:#b91c1c}
        .yai-switch{position:relative;display:inline-block;width:44px;height:24px;flex:0 0 auto;margin-top:2px}
        .yai-switch input{opacity:0;width:0;height:0}
        .yai-slider{position:absolute;inset:0;background:#cbd5e1;border-radius:999px;transition:.2s;cursor:pointer}
        .yai-slider::before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
        .yai-switch input:checked+.yai-slider{background:#7c3aed}
        .yai-switch input:checked+.yai-slider::before{transform:translateX(20px)}
        .yai-save{background:linear-gradient(135deg,#7c3aed,#4f46e5)!important;border:0!important;border-radius:10px!important;height:44px!important;padding:0 28px!important;font-weight:700!important;color:#fff!important;cursor:pointer;font-size:14px!important;box-shadow:0 4px 12px rgba(124,58,237,.25)}
        .yai-steps{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 18px;margin-top:14px;color:#475569;font-size:12px}
        .yai-steps b{color:#0f172a}
      </style>

      <div class="yai-hero">
        <div class="top">
          <div>
            <h1><span class="dashicons dashicons-cart" style="font-size:26px;width:26px;height:26px"></span> YourAI Seller Connect</h1>
            <p>Capture unfinished checkouts into your <strong>Incomplete</strong> tab and block fraud orders with <strong>Order Guard</strong>.</p>
            <span class="yai-pill"><span class="yai-dot <?php echo $connected ? 'on' : ''; ?>"></span><?php echo $connected ? 'Connected' : 'Not connected'; ?></span>
          </div>
          <a class="yai-dash" href="https://app.youraiseller.com/dashboard" target="_blank" rel="noopener">
            <span class="dashicons dashicons-external" style="font-size:16px;width:16px;height:16px"></span> Open Dashboard
          </a>
        </div>
      </div>

      <form method="post" action="options.php">
        <?php settings_fields('yourai_capture'); ?>

        <div class="yai-card">
          <h2>API Keys</h2>
          <p class="sub">Copy these from your YourAI Seller dashboard → Integration → WooCommerce → <em>Integration URLs &amp; Keys</em>.</p>
          <div class="yai-grid">
            <div class="yai-field">
              <label for="yourai_business_id">Business ID</label>
              <input type="text" id="yourai_business_id" name="yourai_business_id" value="<?php echo $businessId; ?>" placeholder="biz_xxxxxxxx" />
              <p class="hint">Identifies your store.</p>
            </div>
            <div class="yai-field">
              <label for="yourai_api_key">API Key</label>
              <input type="text" id="yourai_api_key" name="yourai_api_key" value="<?php echo $apiKey; ?>" placeholder="yai_xxxxxxxx" />
              <p class="hint">For plugin authentication.</p>
            </div>
          </div>
        </div>

        <div class="yai-card">
          <h2>Features</h2>
          <p class="sub">What this plugin does for your store.</p>
          <div class="yai-grid">
            <div class="yai-feat">
              <span class="ic cap"><span class="dashicons dashicons-cart"></span></span>
              <div>
                <h3>Incomplete Capture
                  <span class="yai-badge <?php echo $connected ? 'on' : 'off'; ?>"><?php echo $connected ? 'Active' : 'Add keys'; ?></span>
                </h3>
                <p>Sends checkout name / phone / address + cart to your Incomplete tab as the customer types — even without “Place Order”.</p>
              </div>
            </div>
            <div class="yai-feat">
              <span class="ic grd"><span class="dashicons dashicons-shield"></span></span>
              <div style="flex:1">
                <h3 style="justify-content:space-between">
                  <span>Order Guard</span>
                  <label class="yai-switch">
                    <input type="checkbox" id="yourai_order_guard" name="yourai_order_guard" value="1" <?php checked($guardOn); ?> />
                    <span class="yai-slider"></span>
                  </label>
                </h3>
                <p>Blocks checkout for any phone / IP / email on your YourAI Order Block List.</p>
              </div>
            </div>
          </div>
          <div style="margin-top:20px">
            <button type="submit" class="button yai-save">Save Changes</button>
          </div>
        </div>
      </form>

      <div class="yai-steps">
        <b>How it works:</b> once your keys are saved everything runs automatically — no extra setup. Capture endpoint: <code><?php echo esc_html(YOURAI_CAPTURE_ENDPOINT); ?></code>
      </div>
    </div>
    <?php
}

/* ---- Order Guard: block checkout for blocked phone / IP / email -------- */
add_action('woocommerce_checkout_process', function () {
    if (get_option('yourai_order_guard', '1') !== '1') return;
    $businessId = yourai_business_id();
    $apiKey = yourai_api_key();
    if (!$businessId || !$apiKey) return;

    $phone = isset($_POST['billing_phone']) ? sanitize_text_field(wp_unslash($_POST['billing_phone'])) : '';
    $email = isset($_POST['billing_email']) ? sanitize_email(wp_unslash($_POST['billing_email'])) : '';
    $ip = class_exists('WC_Geolocation') ? WC_Geolocation::get_ip_address() : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');

    $res = wp_remote_post(YOURAI_GUARD_ENDPOINT, array(
        'timeout' => 6,
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => wp_json_encode(array(
            'businessId' => $businessId,
            'apiKey'     => $apiKey,
            'phone'      => $phone,
            'email'      => $email,
            'ip'         => $ip,
        )),
    ));
    if (is_wp_error($res)) return; // fail open — never break a real checkout
    if ((int) wp_remote_retrieve_response_code($res) !== 200) return;
    $data = json_decode(wp_remote_retrieve_body($res), true);
    if (!empty($data['blocked'])) {
        wc_add_notice(
            __('Sorry, we could not process this order. Please contact us to complete your purchase.', 'yourai'),
            'error'
        );
    }
});

/* ---- Front-end: capture script on the checkout page only --------------- */
add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_checkout') || !is_checkout()) return;
    $businessId = yourai_business_id();
    $apiKey = yourai_api_key();
    if (!$businessId || !$apiKey) return;

    $items = array();
    if (function_exists('WC') && WC()->cart) {
        foreach (WC()->cart->get_cart() as $line) {
            $product = isset($line['data']) ? $line['data'] : null;
            if (!$product) continue;
            $items[] = array(
                'name'  => $product->get_name(),
                'sku'   => $product->get_sku(),
                'qty'   => (int) $line['quantity'],
                'price' => (float) $product->get_price(),
            );
        }
    }

    wp_register_script('yourai-capture', '', array(), '1.0.0', true);
    wp_enqueue_script('yourai-capture');
    wp_localize_script('yourai-capture', 'YouraiCapture', array(
        'endpoint'   => YOURAI_CAPTURE_ENDPOINT,
        'businessId' => $businessId,
        'apiKey'     => $apiKey,
        'items'      => $items,
        'currency'   => get_woocommerce_currency(),
    ));
    wp_add_inline_script('yourai-capture', yourai_capture_inline_js());
});

function yourai_capture_inline_js() {
    return <<<JS
(function () {
  if (!window.YouraiCapture || !YouraiCapture.businessId || !YouraiCapture.apiKey) return;

  var KEY = 'yourai_capture_sid';
  var sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = 'cap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem(KEY, sid);
  }

  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

  function collect() {
    var name = (val('billing_first_name') + ' ' + val('billing_last_name')).trim();
    var addr = [val('billing_address_1'), val('billing_address_2'), val('billing_city'), val('billing_state')].filter(Boolean).join(', ');
    return {
      businessId: YouraiCapture.businessId,
      apiKey: YouraiCapture.apiKey,
      sessionId: sid,
      name: name,
      phone: val('billing_phone'),
      address: addr,
      email: val('billing_email'),
      items: YouraiCapture.items || [],
      currency: YouraiCapture.currency || 'BDT',
      pageUrl: location.href
    };
  }

  var lastSent = '';
  function send(useBeacon) {
    var data = collect();
    if (!data.phone && !data.name) return;
    var body = JSON.stringify(data);
    if (body === lastSent) return;
    lastSent = body;
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(YouraiCapture.endpoint, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(YouraiCapture.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true, mode: 'cors' }).catch(function () {});
      }
    } catch (e) {}
  }

  var timer = null;
  function debounced() { clearTimeout(timer); timer = setTimeout(function () { send(false); }, 1200); }

  ['billing_first_name','billing_last_name','billing_phone','billing_address_1','billing_address_2','billing_city','billing_state','billing_email']
    .forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', debounced);
      el.addEventListener('blur', function () { send(false); });
    });

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(true); });
  window.addEventListener('pagehide', function () { send(true); });
})();
JS;
}
