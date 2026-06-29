<?php
/**
 * Plugin Name: YourAI Seller — Incomplete Order Capture
 * Description: Sends checkout form data (name, phone, address, cart) to YourAI Seller as the customer types, so unfinished checkouts appear in the Incomplete tab — even if they never click "Place Order".
 * Version: 1.0.0
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

/* ---- Settings page (Settings → YourAI Capture) ------------------------- */
add_action('admin_menu', function () {
    add_options_page('YourAI Capture', 'YourAI Capture', 'manage_options', 'yourai-capture', 'yourai_capture_settings_page');
});
add_action('admin_init', function () {
    register_setting('yourai_capture', 'yourai_business_id');
    register_setting('yourai_capture', 'yourai_api_key');
});
function yourai_capture_settings_page() {
    ?>
    <div class="wrap">
        <h1>YourAI Seller — Incomplete Order Capture</h1>
        <p>Copy your <strong>Business ID</strong> and <strong>API Key</strong> from the YourAI Seller
           dashboard (Integration → WooCommerce → <em>Integration URLs &amp; Keys</em>).</p>
        <form method="post" action="options.php">
            <?php settings_fields('yourai_capture'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="yourai_business_id">Business ID</label></th>
                    <td><input type="text" id="yourai_business_id" name="yourai_business_id"
                        value="<?php echo esc_attr(get_option('yourai_business_id', '')); ?>" class="regular-text" style="width:420px" placeholder="biz_xxxxxxxx" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="yourai_api_key">API Key</label></th>
                    <td><input type="text" id="yourai_api_key" name="yourai_api_key"
                        value="<?php echo esc_attr(get_option('yourai_api_key', '')); ?>" class="regular-text" style="width:420px" placeholder="yai_xxxxxxxx" />
                        <p class="description">Endpoint: <code><?php echo esc_html(YOURAI_CAPTURE_ENDPOINT); ?></code></p></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <p>Status:
            <?php echo (yourai_business_id() && yourai_api_key())
                ? '<strong style="color:#16a34a">Connected &#10003;</strong>'
                : '<strong style="color:#dc2626">Business ID / API Key not set</strong>'; ?>
        </p>
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
