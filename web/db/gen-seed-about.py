#!/usr/bin/env python3
# Generates db/seed-about.sql — the full About Fostering page as ordered blocks
# (slot 'main'), decomposed from the mirror. FAQ items are parsed straight out of
# the mirror accordion. Run: python3 db/gen-seed-about.py > db/seed-about.sql
import json, re, os, html as htmllib

U = "/assets/uploads"
MIRROR = os.path.join(os.path.dirname(__file__), "..", "_mirror")

def img(avif, webp, jpg, w=None, h=None):
    o = {"avif": avif, "webp": webp, "jpg": jpg}
    if w: o["w"] = w
    if h: o["h"] = h
    return o

def icon(slug, w, h):
    base = slug.split("-e17")[0] if "-e17" in slug else slug
    return img("%s/2024/10/%s-%d.avif %dw" % (U, slug, w, w), "%s/2024/10/%s-%d.webp %dw" % (U, slug, w, w), "%s/2024/10/%s.png" % (U, base), w, h)

blocks = []

# 0 — hero
blocks.append(("hero", {
    "lead": "PROVIDING HOPE, STABILITY & CARE",
    "heading": "About Fostering",
    "intro": "<p>At Safe Harbours, we believe that every child deserves a safe and nurturing environment. We offer children dealing with trauma, mental health challenges, or simply in need of somewhere to rest their head for the night, the opportunity to grow in supportive homes.</p>",
    "bg": "image-set(url('%s/2024/10/shutterstock_1575539629-2-1-1917.avif') type('image/avif'), url('%s/2024/10/shutterstock_1575539629-2-1-1917.webp') type('image/webp'), url('%s/2024/10/shutterstock_1575539629-2-1.jpg'))" % (U, U, U),
}))

# 1 — banner (What is Foster Care?)
blocks.append(("banner", {
    "heading": "What is Foster Care?",
    "body": "<p>Foster care provides temporary homes for children who cannot stay with their birth families due to various circumstances including neglect, abuse, or family instability. As a foster parent, you’ll offer stability, love, and care to help these children. Safe Harbours specializes in placing children with nuanced needs, ensuring they receive the best care possible while fostering.</p><p><a href=\"/become-a-foster-parent/\">Get Started</a></p>",
    "shorten": False,
}))

# 2 — valueCards (Trauma-Based Care) — large 2-col cards with a background image
cards = [
    {"img": icon("heart-dark-icon-e1729696124837", 123, 125), "title": "Understanding Trauma", "text": "<p>Many children in foster care have experienced significant trauma. At Safe Harbours, we focus on trauma-informed care, recognizing the emotional and psychological scars children may carry and providing the support they need to heal.</p>", "style": "lightpink"},
    {"img": icon("hands-light-icon", 146, 136), "title": "Building Trust", "text": "<p>Foster children often struggle with trust due to their past experiences. We equip our foster parents with the tools and training to help children feel safe and supported, allowing them to rebuild trust at their own pace.</p>", "style": "darknavy"},
    {"img": icon("heart-people-icon", 158, 136), "title": "Supporting Emotional Growth", "text": "<p>Children impacted by trauma require patience and understanding to overcome emotional challenges. Our training ensures foster parents can guide children through emotional regulation and help them process their experiences and feel safe.</p>", "style": "darknavy"},
    {"img": icon("famly-icon", 146, 136), "title": "Collaborative Care", "text": "<p>Fostering is a team effort. At Safe Harbours, we work alongside foster parents, mental health professionals, and social workers to provide comprehensive, ongoing support tailored to each child’s needs.</p>", "style": "lightpink"},
]
blocks.append(("valueCards", {
    "heading": "Trauma-Based Care at Safe Harbours",
    "cards": cards,
    "bg": "image-set(url('%s/2024/10/shutterstock_1575539629-1-1-1913.avif') type('image/avif'), url('%s/2024/10/shutterstock_1575539629-1-1-1913.webp') type('image/webp'), url('%s/2024/10/shutterstock_1575539629-1-1.jpg'))" % (U, U, U),
    "alt": False, "large": True, "cols": 2,
}))

# 3 — faqs (parsed from the mirror accordion)
about = open(os.path.join(MIRROR, "about-fostering.main.html"), encoding="utf-8").read()
items = []
for m in re.finditer(r'<a href="#" class="accordion-title">(.*?)</a>\s*<div class="accordion-content" data-tab-content>(.*?)</div>', about, re.S):
    q = htmllib.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
    a = m.group(2).strip()
    items.append({"q": q, "a": a})
blocks.append(("faqs", {"heading": "Frequently Asked Questions", "items": items}))

# 4 — cta
blocks.append(("cta", {
    "heading": "Ready To Get Started?",
    "body": "<p><strong>Are you ready to make a difference?</strong> Safe Harbours is here to guide you every step of the way. Contact us today to learn more about fostering and how you can get involved. <strong>Your journey to becoming a foster parent begins here…</strong></p>",
    "label": "Get Started", "href": "/become-a-foster-parent/",
}))

# 5 — logos
logos = [
    {"img": img("%s/2024/11/Group-34247-640.avif 640w" % U, "%s/2024/11/Group-34247-640.webp 640w" % U, "%s/2024/11/Group-34247.png" % U)},
    {"img": img("%s/2024/11/Group-34246-640.avif 640w" % U, "%s/2024/11/Group-34246-640.webp 640w" % U, "%s/2024/11/Group-34246.png" % U)},
    {"img": img("%s/2024/11/Group-34245-399.avif 399w" % U, "%s/2024/11/Group-34245-399.webp 399w" % U, "%s/2024/11/Group-34245.png" % U)},
    {"img": img("%s/2024/11/Group-34244-537.avif 537w" % U, "%s/2024/11/Group-34244-537.webp 537w" % U, "%s/2024/11/Group-34244.png" % U)},
    {"img": img("%s/2024/11/Group-34243-576.avif 576w" % U, "%s/2024/11/Group-34243-576.webp 576w" % U, "%s/2024/11/Group-34243.png" % U)},
    {"img": img("%s/2024/11/Group-34237-522.avif 522w" % U, "%s/2024/11/Group-34237-522.webp 522w" % U, "%s/2024/11/Group-34237.png" % U)},
    {"img": img("%s/2024/11/Group-34236-640.avif 640w, %s/2024/11/Group-34236-1024.avif 1024w" % (U, U), "%s/2024/11/Group-34236-640.webp 640w, %s/2024/11/Group-34236-1024.webp 1024w" % (U, U), "%s/2024/11/Group-34236.png" % U)},
]
blocks.append(("logos", {"heading": "Referral Partners", "logos": logos}))

print("-- Generated by db/gen-seed-about.py — the full About Fostering page as blocks.")
print("DELETE FROM content_blocks WHERE page='about-fostering';")
for pos, (kind, body) in enumerate(blocks):
    j = json.dumps(body, ensure_ascii=False).replace("'", "''")
    print("INSERT INTO content_blocks (page,slot,kind,body,position,state,updated_at) VALUES ('about-fostering','main','%s','%s',%d,'published','');" % (kind, j, pos))
import sys
print("-- about-fostering: %d faqs parsed" % len(items), file=sys.stderr)
