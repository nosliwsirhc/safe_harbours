/* One-time migration: replace the mirrored Gravity Forms markup in _mirror/*.body.html
   with clean, semantic .sh-form markup driven by /assets/forms.js. Keyed by the
   original gform id so each form keeps its own fields:
     gform_1 newsletter (footer, all pages)  -> /api/subscribe
     gform_2 contact (contact-us, book)        -> /api/contact
     gform_3 resources "Sign Up"               -> /api/subscribe
     gform_4 foster-parent inquiry             -> /api/contact
   Idempotent: skips a form block already converted. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MIRROR = path.join(process.cwd(), '_mirror');

const FORMS = {
  gform_1: `<form class="sh-form" data-endpoint="/api/subscribe" data-source="Newsletter (footer)" data-success="Thanks — you're subscribed!" novalidate>
  <div class="sh-field">
    <label for="nl-name">Your Name</label>
    <input id="nl-name" name="name" type="text" autocomplete="name">
  </div>
  <div class="sh-field">
    <label for="nl-email">Your Email <span class="sh-req" aria-hidden="true">*</span></label>
    <input id="nl-email" name="email" type="email" required aria-required="true" autocomplete="email">
    <span class="sh-err" role="alert"></span>
  </div>
  <p class="sh-form-disclaimer">By entering your email, you agree to our Terms &amp; Conditions and Privacy Policy, including receipt of emails. You can unsubscribe at any time.</p>
  <div class="cf-turnstile" data-size="flexible"></div>
  <p class="sh-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="company" tabindex="-1" autocomplete="off"></label></p>
  <button type="submit" class="button">Submit</button>
  <p class="sh-form-error" role="alert"></p>
</form>`,

  gform_2: `<form class="sh-form" data-endpoint="/api/contact" data-role="Website contact" data-success="Thanks for reaching out. A member of our team will get back to you within one business day." novalidate>
  <div class="sh-form-row">
    <div class="sh-field"><label for="c-first">First Name</label><input id="c-first" name="first" type="text" autocomplete="given-name"></div>
    <div class="sh-field"><label for="c-last">Last Name</label><input id="c-last" name="last" type="text" autocomplete="family-name"></div>
  </div>
  <div class="sh-form-row">
    <div class="sh-field"><label for="c-phone">Phone <span class="sh-req" aria-hidden="true">*</span></label><input id="c-phone" name="phone" type="tel" required aria-required="true" autocomplete="tel"><span class="sh-err" role="alert"></span></div>
    <div class="sh-field"><label for="c-email">Email <span class="sh-req" aria-hidden="true">*</span></label><input id="c-email" name="email" type="email" required aria-required="true" autocomplete="email"><span class="sh-err" role="alert"></span></div>
  </div>
  <div class="sh-field"><label for="c-msg">Message</label><textarea id="c-msg" name="msg"></textarea></div>
  <div class="cf-turnstile" data-size="flexible"></div>
  <p class="sh-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="hp" tabindex="-1" autocomplete="off"></label></p>
  <button type="submit" class="button">Submit</button>
  <p class="sh-form-error" role="alert"></p>
</form>`,

  gform_3: `<form class="sh-form" data-endpoint="/api/subscribe" data-source="Resources sign-up" data-success="Thanks — you're subscribed!" novalidate>
  <div class="sh-form-row">
    <div class="sh-field"><label for="rs-first">First Name</label><input id="rs-first" name="first" type="text" autocomplete="given-name"></div>
    <div class="sh-field"><label for="rs-last">Last Name</label><input id="rs-last" name="last" type="text" autocomplete="family-name"></div>
  </div>
  <div class="sh-field"><label for="rs-email">Email <span class="sh-req" aria-hidden="true">*</span></label><input id="rs-email" name="email" type="email" required aria-required="true" autocomplete="email"><span class="sh-err" role="alert"></span></div>
  <div class="cf-turnstile" data-size="flexible"></div>
  <p class="sh-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="company" tabindex="-1" autocomplete="off"></label></p>
  <button type="submit" class="button">Sign Up</button>
  <p class="sh-form-error" role="alert"></p>
</form>`,

  gform_4: `<form class="sh-form" data-endpoint="/api/contact" data-role="Recruitment: Foster Parents" data-success="Thanks for your interest! A member of our team will reach out within one business day." novalidate>
  <div class="sh-form-row">
    <div class="sh-field"><label for="fp-first">First Name <span class="sh-req" aria-hidden="true">*</span></label><input id="fp-first" name="first" type="text" required aria-required="true" autocomplete="given-name"><span class="sh-err" role="alert"></span></div>
    <div class="sh-field"><label for="fp-last">Last Name <span class="sh-req" aria-hidden="true">*</span></label><input id="fp-last" name="last" type="text" required aria-required="true" autocomplete="family-name"><span class="sh-err" role="alert"></span></div>
  </div>
  <div class="sh-form-row">
    <div class="sh-field"><label for="fp-email">Email <span class="sh-req" aria-hidden="true">*</span></label><input id="fp-email" name="email" type="email" required aria-required="true" autocomplete="email"><span class="sh-err" role="alert"></span></div>
    <div class="sh-field"><label for="fp-phone">Phone <span class="sh-req" aria-hidden="true">*</span></label><input id="fp-phone" name="phone" type="tel" required aria-required="true" autocomplete="tel"><span class="sh-err" role="alert"></span></div>
  </div>
  <div class="sh-field"><label for="fp-city">Closest Major City or Region <span class="sh-req" aria-hidden="true">*</span></label><input id="fp-city" name="city" type="text" required aria-required="true"><span class="sh-err" role="alert"></span></div>
  <div class="sh-field"><label for="fp-msg">Message</label><textarea id="fp-msg" name="msg"></textarea></div>
  <div class="cf-turnstile" data-size="flexible"></div>
  <p class="sh-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="hp" tabindex="-1" autocomplete="off"></label></p>
  <button type="submit" class="button">Submit</button>
  <p class="sh-form-error" role="alert"></p>
</form>`,
};

let totalReplaced = 0;
const summary = {};
for (const file of readdirSync(MIRROR).filter((f) => f.endsWith('.body.html'))) {
  const p = path.join(MIRROR, file);
  let html = readFileSync(p, 'utf8');
  let changed = false;
  for (const [id, clean] of Object.entries(FORMS)) {
    // match the original Gravity Forms block: <form ... id='gform_X' ...> ... </form>
    const re = new RegExp(`<form\\b[^>]*\\bid='${id}'[^>]*>[\\s\\S]*?<\\/form>`, 'i');
    if (re.test(html)) {
      html = html.replace(re, clean);
      summary[id] = (summary[id] || 0) + 1;
      changed = true;
      totalReplaced++;
    }
  }
  if (changed) writeFileSync(p, html);
}
console.log('replaced form blocks:', JSON.stringify(summary, null, 2));
console.log('total:', totalReplaced);
