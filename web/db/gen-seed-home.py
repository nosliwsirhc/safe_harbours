#!/usr/bin/env python3
# Generates db/seed-home.sql — the home page as blocks. Run:
#   python3 db/gen-seed-home.py > db/seed-home.sql
import json, os

U = "/assets/uploads"

def img(avif, webp, jpg):
    return {"avif": avif, "webp": webp, "jpg": jpg}

blocks = []

blocks.append(("homeHero", {
    "heading": "Become a Foster Parent in Ontario",
    "intro": "<h2>You can give a child the stability they’ve been waiting for.</h2><p>Get the training and ongoing support you need to foster with confidence, including on-call support and a dedicated case management team.</p>",
    "featureHeading": "Fostering in Ontario: What it looks like in practice",
    "featureBody": "<p>When you open your home to a child in need, you’re not just giving them safety, you’re discovering a deeper sense of purpose, connection, and impact in your own life. <strong>Fostering is an opportunity to show up for someone when it matters most.</strong></p><p><a href=\"/about-fostering/\">Become a foster parent</a></p>",
}))

text_rows = (
    "<div class=\"text-row\"><strong>1. You’re never doing this alone</strong><br>Our team offers support, ongoing training, and hands-on guidance so you always feel prepared and confident.</div>"
    "<div class=\"text-row\"><strong>2. We match you with intention and care</strong><br>We approach placements thoughtfully, taking into account your strengths, capacity, and the child’s needs — because stability matters, and the right fit is never taken lightly.</div>"
    "<div class=\"text-row\"><strong>3. Team-Based Approach for Complex Youth</strong><br>For children and youth with higher or more complex needs, Safe Harbours operates a staff-supported care model. Foster parents work as part of a broader team that includes experienced Child and Youth Workers and a child psychologist, providing consistent, day-to-day support. This approach allows caregivers to focus on providing a stable home while children receive coordinated, professional care.</div>"
)
blocks.append(("richSection", {
    "sectionClass": "banner",
    "body": "<div class=\"content-wrap\"><div class=\"grid-x grid-padding-x align-middle\"><div class=\"cell medium-6 large-5\"><p class=\"banner-subtitle\"><strong>WHY SAFE HARBOURS</strong></p><h2>Why foster with Safe Harbours?</h2></div><div class=\"cell medium-6\">%s</div></div></div>" % text_rows,
}))

blocks.append(("richSection", {
    "sectionClass": "main",
    "innerClass": "content",
    "bg": "image-set(url('%s/2024/10/shutterstock_1575539629-1-1920.avif') type('image/avif'), url('%s/2024/10/shutterstock_1575539629-1-1920.webp') type('image/webp'), url('%s/2024/10/shutterstock_1575539629-1.jpg'))" % (U, U, U),
    "body": "<div class=\"grid-x\"><div class=\"cell medium-8 medium-offset-4 large-5 large-offset-6\"><p style=\"color:#F78F8B\" class=\"banner-subtitle\">HOW IT WORKS</p><h2>How do you become a foster parent?</h2><p>Becoming a foster parent is a life-changing decision that can bring immense <strong>joy and fulfillment</strong>. Safe Harbours offers a comprehensive training program that equips you with the skills and knowledge needed to provide exceptional care. Our team is here to support you with personalized guidance, ensuring that you’re prepared to make a <strong>meaningful difference</strong> in a child’s life.</p><p><a href=\"/become-a-foster-parent/\" aria-label=\"Get Started: Become A Foster Parent\">Get Started</a></p></div><svg class=\"main-svg\" xmlns=\"http://www.w3.org/2000/svg\" width=\"231\" height=\"248\" viewBox=\"0 0 231 248\" fill=\"none\"><circle cx=\"128.073\" cy=\"102.008\" r=\"87\" transform=\"rotate(78.9952 128.073 102.008)\" fill=\"#DAB527\" fill-opacity=\"0.65\"></circle><circle cx=\"63.9014\" cy=\"183.251\" r=\"54.5\" transform=\"rotate(78.9952 63.9014 183.251)\" fill=\"#F9A5A2\"></circle></svg></div>",
}))

testi = [
    {"quote": "“Safe Harbours provided me with the support and training I needed to become a successful foster parent. I highly recommend their services.”", "author": "Carly T", "role": "Foster Parent"},
    {"quote": "“I can't thank Safe Harbours enough for the care and support they provided for my foster child. They truly made a difference in his life.”", "author": "Ziya C", "role": "Foster Parent"},
    {"quote": "“Safe Harbours is an amazing organization. They provide quality care and services for foster children and families alike.”", "author": "Sarah J", "role": "Foster Parent"},
]
blocks.append(("testimonials", {"items": testi}))

blocks.append(("cta", {
    "heading": "Here’s your first step.",
    "body": "<p>Becoming a foster parent starts with understanding what the journey looks like. We’ve put together a simple, helpful guide to walk you through everything you need to know before opening your home.</p><p><strong>The Complete Guide to Becoming a Foster Parent</strong></p><p><em>What’s inside the guide:</em></p><ul><li>What fostering looks like day-to-day</li><li>The different types of fostering</li><li>How Safe Harbours supports you every step of the way</li><li>What makes someone a great foster parent</li><li>The process from first conversation to placement</li><li>Answers to common worries and misconceptions</li></ul>",
    "label": "Download Your Guide", "href": "/become-a-foster-parent/",
}))

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

print("-- Generated by db/gen-seed-home.py — the home page as blocks.")
print("DELETE FROM content_blocks WHERE page='home';")
for pos, (kind, body) in enumerate(blocks):
    j = json.dumps(body, ensure_ascii=False).replace("'", "''")
    print("INSERT INTO content_blocks (page,slot,kind,body,position,state,updated_at) VALUES ('home','main','%s','%s',%d,'published','');" % (kind, j, pos))
