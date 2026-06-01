/* Bridges the mirrored Gravity Forms markup to the site's Cloudflare endpoints.
   The original Gravity Forms JS is stripped during mirroring, so these forms
   would otherwise do a native submit to WordPress. We intercept and POST JSON
   to /api/subscribe (newsletter, gform_1) or /api/contact (gform_2). */
(function () {
  function showConfirmation(form, msg) {
    var div = document.createElement('div');
    div.className = 'gform_confirmation_message';
    div.setAttribute('role', 'status');
    div.textContent = msg;
    if (form.parentNode) form.parentNode.replaceChild(div, form);
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
        var hp = hpEl ? hpEl.value : '';
        var btn = form.querySelector('[type="submit"]');
        var newsletter = form.id === 'gform_1';
        var url, payload, okMsg;
        if (newsletter) {
          url = '/api/subscribe';
          payload = { name: val('input_1'), email: val('input_3'), company: hp };
          okMsg = 'Thanks — you’re subscribed!';
        } else {
          url = '/api/contact';
          payload = {
            first: val('input_3'), last: val('input_5'),
            phone: val('input_7'), email: val('input_6'),
            msg: val('input_8'), role: 'Website contact', hp: hp,
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
            alert((data && data.error) || 'Something went wrong. Please try again, or call us.');
            if (btn) btn.disabled = false;
          }
        } catch (err) {
          alert('We could not reach the server. Please try again, or call us.');
          if (btn) btn.disabled = false;
        }
      },
      true
    );
  }

  function init() {
    var forms = document.querySelectorAll('form[id^="gform_"]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
