<?php
/**
 * Plugin Name: YourAI Seller — Incomplete Order Capture
 * Description: Sends checkout form data (name, phone, address, cart) to YourAI Seller as the customer types, so unfinished checkouts appear in the Incomplete tab — even if they never click "Place Order".
 * Version: 1.1.0
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
        'YourAI Seller',
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
});
function yourai_capture_settings_page() {
    $businessId = esc_attr(get_option('yourai_business_id', ''));
    $apiKey = esc_attr(get_option('yourai_api_key', ''));
    $connected = yourai_business_id() && yourai_api_key();
    ?>
    <div class="wrap" style="max-width:980px">
      <style>
        .yai-hero{background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:16px;color:#fff;padding:26px 28px;margin:18px 0;position:relative;overflow:hidden}
        .yai-hero h1{color:#fff;font-size:24px;margin:0 0 6px;display:flex;align-items:center;gap:10px}
        .yai-hero p{margin:0;opacity:.9;font-size:13px}
        .yai-pill{display:inline-flex;align-items:center;gap:7px;margin-top:14px;background:rgba(255,255,255,.16);padding:7px 14px;border-radius:999px;font-weight:700;font-size:12px}
        .yai-dot{width:9px;height:9px;border-radius:999px;background:#facc15}
        .yai-dot.on{background:#34d399}
        .yai-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px 24px;margin-top:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
        .yai-card h2{margin:0 0 4px;font-size:16px}
        .yai-card .sub{color:#6b7280;font-size:12px;margin:0 0 16px}
        .yai-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:782px){.yai-grid{grid-template-columns:1fr}}
        .yai-field label{display:block;font-weight:700;font-size:12px;color:#374151;margin-bottom:6px}
        .yai-field input{width:100%;height:42px;border:1px solid #d1d5db;border-radius:10px;padding:0 12px;font-size:14px}
        .yai-field .hint{color:#9ca3af;font-size:11px;margin-top:5px}
        .yai-save{background:linear-gradient(135deg,#7c3aed,#4f46e5)!important;border:0!important;border-radius:10px!important;height:42px!important;padding:0 26px!important;font-weight:700!important;color:#fff!important;cursor:pointer}
        .yai-steps{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;margin-top:16px;color:#065f46;font-size:12.5px}
        .yai-steps b{color:#064e3b}
      </style>

      <div class="yai-hero">
        <h1><span class="dashicons dashicons-cart" style="font-size:26px;width:26px;height:26px"></span> YourAI Seller — Incomplete Capture</h1>
        <p>Catch checkouts your customers start but never finish — they appear in your YourAI Seller <strong>Incomplete</strong> tab.</p>
        <span class="yai-pill"><span class="yai-dot <?php echo $connected ? 'on' : ''; ?>"></span><?php echo $connected ? 'Connected' : 'Not connected — add your keys below'; ?></span>
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
          <div style="margin-top:20px">
            <button type="submit" class="button yai-save">Save Changes</button>
          </div>
        </div>
      </form>

      <div class="yai-steps">
        <b>How it works:</b> once your keys are saved, this plugin sends the checkout name / phone / address + cart to YourAI Seller as the customer types — even if they never press “Place Order”. Endpoint: <code><?php echo esc_html(YOURAI_CAPTURE_ENDPOINT); ?></code>
      </div>
    </div>
    <?php
}

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
