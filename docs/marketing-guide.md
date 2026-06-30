# Marketing guide — running the Safe Harbours website yourself

This guide is for the marketing team. It explains how to do, on your own, the
things that used to need a developer: edit pages, launch campaign landing pages,
send old links to new ones, add advertising pixels, and decide what counts as a
conversion. No code, no waiting for a release.

Everything happens in the **admin** at **https://www.safeharbours.ca/admin**.

---

## Signing in

1. Go to **https://www.safeharbours.ca/admin**.
2. You'll be asked to sign in with your work email (a one-time code is sent to
   your inbox). Enter the code.
3. You're in. The bar across the top has four areas: **Pages**, **Resources**,
   **Redirects**, **Settings**.

There's no shared password — access is tied to your own email, so each person
signs in as themselves.

> **Golden rule: nothing is live until you click _Publish changes_.** Everything
> you type saves automatically as a private **draft**. The public website doesn't
> change until you publish. So feel free to experiment.

---

## 1. Editing a page

Use this for the main site pages (Home, Our Story, About Fostering, Become a
Foster Parent, Contact, etc.).

1. Click **Pages** in the top bar.
2. Click the page you want to change.
3. You'll see the page as a list of **sections** on the left and a live preview
   of the real page on the right. As you type, the preview updates.
   - **Edit text:** click into any box and type. Use the **B** / **I** / **Link**
     buttons for bold, italic, and links.
   - **Reorder:** drag the **⠿** handle (or use the ↑ / ↓ buttons) to move a
     section up or down.
   - **Add a section:** click a button under **"Add a section"** at the bottom.
   - **Remove a section:** click **Remove**, then confirm.
   - **Add a picture:** in sections that take an image, click **Upload image…**
     and choose a JPEG or PNG. It's resized for you automatically.
4. The status pill at the top shows **Saving… / Saved** — your draft is safe.
5. When you're happy, click **Publish changes**. The live site updates within a
   few seconds.

> **Preview a draft before publishing:** the right-hand panel *is* your draft
> preview. Use the **Desktop / Tablet / Mobile** buttons to check how it looks on
> phones. The public never sees the draft — only you do, while signed in.

---

## 2. Campaign & landing pages

Build a standalone page for an ad campaign or a specific audience — live the
moment you publish, no developer needed.

**Create one:**

1. Top bar → **Pages**, then click **Campaign & landing pages** (or go straight
   to `/admin/pages`).
2. Under **Create a new page**, type a **Page title** (e.g. "Spring Foster
   Campaign"). A **web address** is suggested from the title — you can change it
   (lowercase letters, numbers and dashes, e.g. `spring-foster-campaign`).
3. Click **Create & edit**. The page opens in the same section editor you use for
   the main pages — add a hero, text, a call-to-action, a form, whatever you need.

**Settings on a campaign page (top of the editor):**

- **Page title** — shows in the browser tab and in Google results.
- **Search description** — the grey line under the title in Google results.
- **Hide this page from search engines** — *on by default.* Keep it on while the
  page is private/in progress; turn it off when you want Google to find it.

**Go live:** click **Publish changes**. Your page is now at
`https://www.safeharbours.ca/<your-web-address>`.

**The address to put in your ad:** `https://www.safeharbours.ca/spring-foster-campaign`
(use your actual web address). Tracking bits like `?utm_source=…` on the end are
fine — they won't break anything.

**Delete a page:** open it and click **Delete this page** at the bottom (you'll
be asked to confirm).

> New campaign pages are **hidden from search** and **not added to the site menu**
> by default, so a half-built page never leaks out before you're ready.

---

## 3. Redirects — send an old link to a new one

Moved or retired a page? Point the old web address at the new one so old links and
search results don't hit a dead end.

1. Top bar → **Redirects**.
2. Under **Add a redirect**:
   - **From** — the old address on this site, e.g. `/old-campaign`.
   - **To** — the new address on this site, e.g. `/become-a-foster-parent`.
   - **Type** — **Permanent** (the page moved for good — best for SEO) or
     **Temporary** (it's briefly elsewhere).
3. Click **Add**. It takes effect right away.

To remove one, click **Remove** next to it (click again to confirm).

**Rules (the form will tell you if something's off):**

- Both addresses must be **on this site** (start with `/`). You can't redirect to
  another website from here — that's on purpose, for safety.
- You can't redirect built-in areas like `/admin`.
- You can't create a loop (A → B → A) — it'll warn you.

---

## 4. Marketing pixels (Meta, TikTok, LinkedIn, Google Ads)

Add advertising "pixels" so your ad platforms can measure and retarget. You only
paste an **ID** — the tracking code is added for you, and pixels **only load after
a visitor accepts cookies**, so they respect consent automatically.

1. Top bar → **Settings** → scroll to **Marketing pixels**.
2. Paste the ID for each platform you use (leave the rest blank):
   - **Meta (Facebook) Pixel ID** — a long number (Events Manager → Data sources).
   - **TikTok Pixel ID** — letters and numbers (TikTok Ads → Assets → Events).
   - **LinkedIn Insight partner ID** — a short number (Campaign Manager → Insight Tag).
   - **Google Ads conversion ID** — starts with `AW-` (Google Ads → Goals).
3. It saves automatically. If an ID is in the wrong format, the box turns red and a
   message tells you what it should look like — fix it and it saves.

That's it — the pixel is now on every page, firing only for visitors who've
accepted cookies.

---

## 5. Form conversions — events & thank-you pages

Decide what happens when someone submits a form: which **event** is sent to your
analytics / Google Tag Manager (so you can count it as a conversion), and which
**thank-you page** they land on.

1. Top bar → **Settings** → scroll to **Form conversions**.
2. For each form (Contact, Foster parent enquiry, Newsletter signups), you can set:
   - **Event name** — the name your analytics/GTM sees, e.g. `foster_lead`. Use
     letters, numbers and underscores; start with a letter. Leave blank to keep the
     default.
   - **Thank-you page** — where visitors go after submitting, e.g.
     `/thank-you-fostering` (a page on this site). Leave blank to show the inline
     "Thanks, we got it" message instead.
3. It saves automatically.

> **Tip:** a dedicated thank-you page is the most reliable way to count a
> conversion in Google Tag Manager — fire your conversion tag on a visit to that
> page.

---

## 6. Resources (blog articles)

Top bar → **Resources** to write and publish articles. Same idea as the pages:
edit, save as a draft, **Publish** when ready. New articles appear on `/resources`
immediately.

---

## How would I run an A/B test?

There's no formal A/B testing tool — at our current traffic it would take many
months to get a trustworthy result, so it isn't worth the complexity yet. If you
want to compare two approaches now, the practical way is:

1. Build **two campaign pages** (e.g. `/join-a` and `/join-b`).
2. Give each form a **different event name** (Settings → Form conversions) so you
   can tell their conversions apart.
3. Split your ad spend between the two links and compare the conversion numbers
   over a few weeks as a directional guide.

---

## Quick answers

- **I published something by mistake.** Edit it back and publish again — changes
  are reversible. Nothing is permanent except deleting a campaign page or article.
- **My change isn't showing.** Did you click **Publish changes**? Drafts are
  private until published. After publishing, give it a few seconds and refresh.
- **Can I link to a campaign page from the menu?** Not yet — campaign pages are
  standalone by design. Ask a developer if you need one in the main navigation.
- **Who can sign in?** Anyone with an approved work email. To add or remove a
  person, ask a developer (it's managed in Cloudflare Access).
- **Something looks broken / I'm stuck.** Don't force it — message the dev team
  with the page and what you were doing.
