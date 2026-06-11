#!/usr/bin/env python3
# Generates db/seed-book.sql — the Book an Appointment landing page as blocks.
# Run: python3 db/gen-seed-book.py > db/seed-book.sql
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

book = open(os.path.join(MIRROR, "book-an-appointment.main.html"), encoding="utf-8").read()
cal = re.search(r'data-url="([^"]+)"', book)
calendly = htmllib.unescape(cal.group(1)) if cal else ""

blocks = []

blocks.append(("hero", {
    "lead": "SAFE HARBOURS",
    "heading": "Give a Traumatized Child the Safety, Love, and Future They Deserve",
    "intro": "<p>Right now, there are children in Ontario who have nowhere safe to go. They’ve faced trauma, addiction, even exploitation, and they urgently need homes where they can feel protected, supported, and loved. Safe Harbours equips everyday people like you with the training, support, and resources to make that possible. If you’ve ever felt called to make a real difference, this is your chance.</p><p><a class=\"button\" href=\"#book\">Book a Consultation</a></p>",
    "bg": "image-set(url('%s/2025/10/eab76d9f553da936be9cfefd6ce5cef1c9a6d7db-scaled-1920.avif') type('image/avif'), url('%s/2025/10/eab76d9f553da936be9cfefd6ce5cef1c9a6d7db-scaled-1920.webp') type('image/webp'), url('%s/2025/10/eab76d9f553da936be9cfefd6ce5cef1c9a6d7db-scaled.jpg'))" % (U, U, U),
    "variant": "booking-hero",
}))

blocks.append(("eventSection", {
    "eyebrow": "Start Here. ",
    "heading": "Book a call with Chris!",
    "body": "<p>Reserve time with Safe Harbours’ very own Parent Experience Coordinator, to answer any introductory questions you may have. You won’t be on this journey alone. We offer training, education, and counselling support along the way.</p>",
    "calendlyUrl": calendly,
    "bg": "image-set(url('%s/2025/10/sdds-scaled-1920.avif') type('image/avif'), url('%s/2025/10/sdds-scaled-1920.webp') type('image/webp'), url('%s/2025/10/sdds-scaled.jpg'))" % (U, U, U),
}))

steps = [
    {"reverse": False, "heading": "Why Should You Foster A Child?",
     "body": "<p>Every day in Ontario, children are removed from unsafe environments because of abuse, neglect, trauma, or exploitation. Many of these kids have nowhere safe to go, and without the right foster homes, they risk falling deeper into cycles of pain, addiction, and instability. Fostering gives them something they’ve lost: hope, stability, and a chance to heal.</p><p>We equip you with specialized training, 24/7 support, and a community of care, so you’ll never feel like you’re doing this alone.<br>When you foster, you don’t just change one child’s life; you change their future.</p>",
     "img": img("%s/2025/10/Frame-34158-640.avif 640w" % U, "%s/2025/10/Frame-34158-640.webp 640w" % U, "%s/2025/10/Frame-34158.png" % U, 834, 807)},
    {"reverse": False, "heading": "How To Become A Foster Parent",
     "body": "<p>Getting started is simple. It begins with a friendly home visit and a short application, including background and safety checks. From there, we guide you through a home study to ensure the right fit and provide specialized trauma-focused training so you feel fully prepared and confident. Safe Harbours makes every step clear and supportive, so you can focus on what matters most: giving a child a safe, loving home.</p><p><a class=\"button\" href=\"#book\">Book a Consultation</a></p>",
     "img": img("%s/2025/10/Frame-3412-640.avif 640w" % U, "%s/2025/10/Frame-3412-640.webp 640w" % U, "%s/2025/10/Frame-3412.png" % U, 834, 696)},
]
blocks.append(("steps", {"heading": "", "steps": steps, "sectionClass": "lp-section"}))

cards = [
    {"img": icon("house-icon-e1729732863639", 147, 134), "title": "Specialized Trauma Training", "text": "<p>Learn evidence-based strategies to care for children with exceptional needs.</p>", "style": "navy"},
    {"img": icon("heart-people-2", 132, 132), "title": "Premium Compensation", "text": "<p>Receive a higher per diem that reflects the added time and commitment.</p>", "style": "pink"},
    {"img": icon("hands-light-icon", 146, 136), "title": "24/7 Professional Support", "text": "<p>Round-the-clock access to staff, resources, and emergency help.</p>", "style": "navy"},
    {"img": icon("famly-icon", 146, 136), "title": "Ongoing Staffing Help", "text": "<p>Additional support staff are available when a child’s needs require it.</p>", "style": "lightpink"},
    {"img": icon("heart-people", 142, 142), "title": "Lasting Transformation", "text": "<p>Your role creates hope, stability, and a path to healing for youth who need it most.</p>", "style": "navy"},
]
blocks.append(("valueCards", {"heading": "Why Choose Safe Harbours", "cards": cards}))

testi = [
    {"quote": "“Safe Harbours provided me with the support and training I needed to become a successful foster parent. I highly recommend their services.”", "author": "Carly T", "role": "Foster Parent"},
    {"quote": "“I can't thank Safe Harbours enough for the care and support they provided for my foster child. They truly made a difference in his life.”", "author": "Ziya C", "role": "Foster Parent"},
    {"quote": "“Safe Harbours is an amazing organization. They provide quality care and services for foster children and families alike.”", "author": "Sarah J", "role": "Foster Parent"},
]
blocks.append(("testimonials", {"items": testi}))

blocks.append(("contactHero", {
    "heading": "Contact Us today",
    "description": "<p>Have questions about fostering with Safe Harbours?  Our team is here to answer them. Reach out to us and we will get back to you as soon as we can.</p>",
    "variant": "contact-hero", "showImage": False,
    "bg": "image-set(url('%s/2024/10/Hero-ContactUs-scaled-1920.avif') type('image/avif'), url('%s/2024/10/Hero-ContactUs-scaled-1920.webp') type('image/webp'), url('%s/2024/10/Hero-ContactUs-scaled.jpg'))" % (U, U, U),
}))

print("-- Generated by db/gen-seed-book.py — the Book an Appointment landing page as blocks.")
print("DELETE FROM content_blocks WHERE page='book-an-appointment';")
for pos, (kind, body) in enumerate(blocks):
    j = json.dumps(body, ensure_ascii=False).replace("'", "''")
    print("INSERT INTO content_blocks (page,slot,kind,body,position,state,updated_at) VALUES ('book-an-appointment','main','%s','%s',%d,'published','');" % (kind, j, pos))
