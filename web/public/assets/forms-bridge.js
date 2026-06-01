/* Bridges the mirrored Gravity Forms markup to the site's Cloudflare endpoints.
   The original Gravity Forms JS is stripped during mirroring, so we:
   1) render the existing Cloudflare Turnstile widgets (.cf-turnstile) using our
      own site key (window.__TS_KEY, injected by ThemeLayout so it matches the
      Worker's TURNSTILE_SECRET_KEY), then
   2) intercept submit and POST JSON to /api/subscribe (newsletter, gform_1) or
      /api/contact (gform_2), forwarding the Turnstile token. */
(function () {
  var TEST_KEY = '1x00000000000000000000AA'; // Cloudflare's always-pass test key
  function tsKey() {
    return (window.__TS_KEY && String(window.__TS_KEY).length) ? window.__TS_KEY : TEST_KEY;
  }

  // Point every mirrored Turnstile widget at our key, then load the API so it
  // auto-renders them and injects each form's cf-turnstile-response input.
  function initTurnstile() {
    var widgets = document.querySelectorAll('.cf-turnstile[data-sitekey]');
    if (!widgets.length) return;
    for (var i = 0; i < widgets.length; i++) widgets[i].setAttribute('data-sitekey', tsKey());
    if (document.querySelector('script[data-turnstile]')) return;
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true; s.defer = true; s.setAttribute('data-turnstile', '1');
    document.head.appendChild(s);
  }

  function showConfirmation(form, msg) {
    var div = document.createElement('div');
    div.className = 'gform_confirmation_message';
    div.setAttribute('role', 'status');
    div.textContent = msg;
    if (form.parentNode) form.parentNode.replaceChild(div, form);
  }

  // Inline, accessible error (replaces native alert()).
  function showError(form, msg) {
    var el = form.querySelector('.mirror-form-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'mirror-form-error';
      el.setAttribute('role', 'alert');
      form.appendChild(el);
    }
    el.textContent = msg;
  }
  function clearError(form) {
    var el = form.querySelector('.mirror-form-error');
    if (el) el.textContent = '';
  }

  function bind(form) {
    form.addEventListener(
      'submit',
      async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var val = function (n) {
          var el = form.querySelector('[name="' + n + '"]');
          return el ? String(el.value || '').trim() : '';
        };
        var hpEl = form.querySelector('[name="ak_hp_textarea"]');
        var hp = hpEl ? String(hpEl.value || '').trim() : '';
        var tokenEl = form.querySelector('[name="cf-turnstile-response"]');
        var token = tokenEl ? tokenEl.value : '';
        var btn = form.querySelector('[type="submit"]');
        var newsletter = form.id === 'gform_1';

        clearError(form);
        // Require the Turnstile token (bot protection) when a widget is present.
        if (form.querySelector('.cf-turnstile') && !token) {
          showError(form, 'Please complete the verification, then submit again.');
          return;
        }

        var url, payload, okMsg;
        if (newsletter) {
          url = '/api/subscribe';
          payload = { name: val('input_1'), email: val('input_3'), company: hp, token: token };
          okMsg = 'Thanks — you’re subscribed!';
        } else {
          url = '/api/contact';
          payload = {
            first: val('input_3'), last: val('input_5'),
            phone: val('input_7'), email: val('input_6'),
            msg: val('input_8'), role: 'Website contact', hp: hp, token: token,
          };
          okMsg = 'Thanks for reaching out. A member of our team will get back to you within one business day.';
        }
        if (btn) btn.disabled = true;
        try {
          var res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          var data = await res.json().catch(function () { return {}; });
          if (res.ok && data.ok) {
            showConfirmation(form, okMsg);
            if (window.gtag) window.gtag('event', 'generate_lead', { form_location: location.pathname });
          } else {
            showError(form, (data && data.error) || 'Something went wrong. Please try again, or call us.');
            if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
            if (btn) btn.disabled = false;
          }
        } catch (err) {
          showError(form, 'We could not reach the server. Please try again, or call us.');
          if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
          if (btn) btn.disabled = false;
        }
      },
      true
    );
  }

  // Autoplay videos (marked data-autoplay by the mirror, preload=none) only
  // load + play once scrolled into view — saves bandwidth/CPU on first paint.
  function initVideos() {
    var vids = document.querySelectorAll('video[data-autoplay]');
    if (!vids.length) return;
    var play = function (v) {
      v.preload = 'auto';
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { play(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '200px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  function init() {
    initTurnstile();
    initVideos();
    var forms = document.querySelectorAll('form[id^="gform_"]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
