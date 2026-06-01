/* Drives the site's clean forms (form.sh-form). Each form declares its target
   via data-endpoint (/api/subscribe or /api/contact), a success message via
   data-success, and uses semantic field names (name, first, last, email, phone,
   msg, city). This REPLACES the old Gravity Forms "bridge": there is no input_N
   mapping and no per-form special-casing — the markup is real, so the script is
   generic.

   Responsibilities:
   1) render the Cloudflare Turnstile widgets with our site key
      (window.__TS_KEY, injected by ThemeLayout so it matches the Worker secret),
   2) format/validate input, POST JSON to the form's endpoint, show inline field
      errors + an inline success state,
   3) keep the scroll-to-play behaviour for mirrored autoplay videos. */
(function () {
  var TEST_KEY = '1x00000000000000000000AA'; // Cloudflare always-pass test key
  function tsKey() {
    return window.__TS_KEY && String(window.__TS_KEY).length ? window.__TS_KEY : TEST_KEY;
  }

  // ---- validation helpers ----
  function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function isValidPhone(s) { return digits(s).length === 10; }
  function formatPhone(v) {
    var d = digits(v).slice(0, 10);
    if (d.length > 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    if (d.length > 3) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    if (d.length > 0) return '(' + d.slice(0, 3);
    return '';
  }

  // ---- Turnstile: point every widget at our key, then load the API so it
  // auto-renders them and injects each form's cf-turnstile-response input. ----
  function initTurnstile() {
    var widgets = document.querySelectorAll('.cf-turnstile');
    if (!widgets.length) return;
    for (var i = 0; i < widgets.length; i++) widgets[i].setAttribute('data-sitekey', tsKey());
    if (document.querySelector('script[data-turnstile]')) return;
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true; s.defer = true; s.setAttribute('data-turnstile', '1');
    document.head.appendChild(s);
  }

  // ---- inline errors ----
  function fieldOf(input) { return input.closest ? input.closest('.sh-field') : null; }
  function setFieldError(field, msg) {
    if (!field) return;
    var err = field.querySelector('.sh-err');
    if (msg) { field.classList.add('sh-field--err'); if (err) err.textContent = msg; }
    else { field.classList.remove('sh-field--err'); if (err) err.textContent = ''; }
  }
  function formError(form, msg) {
    var el = form.querySelector('.sh-form-error');
    if (el) el.textContent = msg || '';
  }

  // Validate required + email/phone formats. Required is driven by the field's
  // `required` attribute; format checks key off type="email"/type="tel" or the
  // field name, so the rules follow the markup with no per-form config.
  function validate(form) {
    var errs = [];
    var inputs = form.querySelectorAll('input[name], textarea[name], select[name]');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.type === 'hidden' || el.name === 'company' || el.name === 'hp' || el.name === 'cf-turnstile-response') continue;
      var v = String(el.value || '').trim();
      if (el.hasAttribute('required') && !v) { errs.push({ el: el, msg: 'Required' }); continue; }
      if (v && (el.type === 'email' || el.name === 'email') && !isValidEmail(v)) { errs.push({ el: el, msg: 'Enter a valid email address' }); continue; }
      if (v && (el.type === 'tel' || el.name === 'phone') && !isValidPhone(v)) { errs.push({ el: el, msg: 'Enter a 10-digit phone number' }); continue; }
    }
    return errs;
  }

  function buildPayload(form, token) {
    var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
    var hpEl = form.querySelector('[name="company"], [name="hp"]');
    var hp = hpEl ? String(hpEl.value || '').trim() : '';
    if (/subscribe/.test(form.getAttribute('data-endpoint') || '')) {
      return { name: get('name') || (get('first') + ' ' + get('last')).trim(), email: get('email'), company: hp, token: token };
    }
    var msg = get('msg');
    var city = get('city');
    if (city) msg = 'Closest major city/region: ' + city + (msg ? '\n\n' + msg : '');
    return {
      first: get('first'), last: get('last'), email: get('email'), phone: get('phone'),
      role: form.getAttribute('data-role') || 'Website contact', msg: msg, hp: hp, token: token,
    };
  }

  function showSuccess(form, msg) {
    var div = document.createElement('div');
    div.className = 'sh-form-ok';
    div.setAttribute('role', 'status');
    div.setAttribute('tabindex', '-1');
    var svg = '<svg viewBox="0 0 52 52" class="sh-ok-check" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-18"/></svg>';
    var p = document.createElement('p');
    p.textContent = msg;
    div.innerHTML = svg;
    div.appendChild(p);
    if (form.parentNode) form.parentNode.replaceChild(div, form);
    try { div.focus(); } catch (x) {}
  }

  function bind(form) {
    var phoneInput = form.querySelector('input[name="phone"], input[type="tel"]');
    var submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el === phoneInput) {
        phoneInput.value = formatPhone(phoneInput.value);
        try { phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length); } catch (x) {}
      }
      setFieldError(fieldOf(el), '');
      formError(form, '');
    }, true);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      formError(form, '');

      var fields = form.querySelectorAll('.sh-field');
      for (var i = 0; i < fields.length; i++) setFieldError(fields[i], '');
      var errs = validate(form);
      if (errs.length) {
        for (var j = 0; j < errs.length; j++) setFieldError(fieldOf(errs[j].el), errs[j].msg);
        try { errs[0].el.focus(); } catch (x) {}
        return;
      }

      var tokenEl = form.querySelector('[name="cf-turnstile-response"]');
      var token = tokenEl ? tokenEl.value : '';
      if (form.querySelector('.cf-turnstile') && !token) {
        formError(form, 'Please complete the verification, then submit again.');
        return;
      }

      var endpoint = form.getAttribute('data-endpoint');
      var payload = buildPayload(form, token);
      var okMsg = form.getAttribute('data-success') || 'Thanks — we got it.';
      if (submitBtn) submitBtn.disabled = true;
      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () { return {}; });
        if (res.ok && data.ok) {
          showSuccess(form, okMsg);
          if (window.gtag) window.gtag('event', 'generate_lead', { form_location: location.pathname });
        } else {
          formError(form, (data && data.error) || 'Something went wrong. Please try again, or call us.');
          if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
          if (submitBtn) submitBtn.disabled = false;
        }
      } catch (err) {
        formError(form, 'We could not reach the server. Please try again, or call us.');
        if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
        if (submitBtn) submitBtn.disabled = false;
      }
    }, true);
  }

  // Autoplay videos (marked data-autoplay by the mirror, preload=none) only
  // load + play once scrolled into view — saves bandwidth/CPU on first paint.
  function initVideos() {
    var vids = document.querySelectorAll('video[data-autoplay]');
    if (!vids.length) return;
    var play = function (v) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { play(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '200px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  function init() {
    initTurnstile();
    initVideos();
    var forms = document.querySelectorAll('form.sh-form');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
