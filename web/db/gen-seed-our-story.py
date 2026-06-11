#!/usr/bin/env python3
# Generates db/seed-our-story.sql — the full Our Story page as ordered content
# blocks (slot 'main'), decomposed from the original mirror markup. Run:
#   python3 db/gen-seed-our-story.py > db/seed-our-story.sql
import json

U = "/assets/uploads"

def img(avif, webp, jpg, w=None, h=None):
    o = {"avif": avif, "webp": webp, "jpg": jpg}
    if w: o["w"] = w
    if h: o["h"] = h
    return o

blocks = []

# 0 — hero
blocks.append(("hero", {
    "lead": "Building Safe and Supportive Homes for Children in Need",
    "heading": "Our Story",
    "intro": "<p>Safe Harbours is a foster care organization committed to providing safe, nurturing homes for children facing significant challenges, including trauma and mental health issues.</p>",
    "bg": "image-set(url('%s/2024/10/shutterstock_1575539629-2-2-1917.avif') type('image/avif'), url('%s/2024/10/shutterstock_1575539629-2-2-1917.webp') type('image/webp'), url('%s/2024/10/shutterstock_1575539629-2-2.jpg'))" % (U, U, U),
}))

# 1 — banner (Our Purpose)
blocks.append(("banner", {
    "heading": "Our Purpose",
    "body": "<p>At Safe Harbours, our purpose is to ensure that every child in need is placed in a home where they are safe, supported, and given the opportunity to grow. We carefully recruit and train foster parents who are committed to making a lasting difference in a child’s life. By prioritizing trauma-informed care and providing ongoing support, we help both children and foster families navigate the challenges of fostering with confidence and compassion.</p>",
}))

# 2 — valueCards (Our Values)
value_cards = [
    {"img": img("%s/2024/10/house-icon-e1729732863639-147.avif 147w" % U, "%s/2024/10/house-icon-e1729732863639-147.webp 147w" % U, "%s/2024/10/house-icon-e1729732863639.png" % U, 147, 134),
     "title": "Safety First", "text": "<p>We place the safety and well-being of children above all else, ensuring every foster home is thoroughly screened and prepared for the challenges ahead.</p>", "style": "navy"},
    {"img": img("%s/2024/10/heart-people-2-132.avif 132w" % U, "%s/2024/10/heart-people-2-132.webp 132w" % U, "%s/2024/10/heart-people-2.png" % U, 132, 132),
     "title": "Lasting Impact", "text": "<p>Our goal is to create long-term, positive change in the lives of children by placing them in stable homes where they can thrive and succeed.</p>", "style": "pink"},
    {"img": img("%s/2024/10/hands-light-icon-146.avif 146w" % U, "%s/2024/10/hands-light-icon-146.webp 146w" % U, "%s/2024/10/hands-light-icon.png" % U, 146, 136),
     "title": "Compassionate Care", "text": "<p>Fostering is about more than just providing a home—it’s about offering love, patience, and understanding to children who need it most.</p>", "style": "navy"},
    {"img": img("%s/2024/10/famly-icon-146.avif 146w" % U, "%s/2024/10/famly-icon-146.webp 146w" % U, "%s/2024/10/famly-icon.png" % U, 146, 136),
     "title": "Continuous Support", "text": "<p>We provide 24/7 guidance and resources to foster parents, ensuring they never feel alone on their fostering journey.</p>", "style": "lightpink"},
    {"img": img("%s/2024/10/heart-people-142.avif 142w" % U, "%s/2024/10/heart-people-142.webp 142w" % U, "%s/2024/10/heart-people.png" % U, 142, 142),
     "title": "Integrity and Trust", "text": "<p>We hold ourselves to the highest standards of honesty and transparency, building trust with foster families and Children’s Aid Societies alike.</p>", "style": "navy"},
]
blocks.append(("valueCards", {"heading": "Our Values", "cards": value_cards}))

# 3 — imageBlock (A Founder With A Passion)
blocks.append(("imageBlock", {
    "img": img("%s/2024/11/ChrisWilson-640.avif 640w" % U, "%s/2024/11/ChrisWilson-640.webp 640w" % U, "%s/2024/11/ChrisWilson.png" % U, 844, 882),
    "heading": "A Founder With A Passion",
    "body": "<p>Safe Harbours was founded by Chris Wilson in 2015, continuing a family legacy of foster care and children’s special needs support that began in the 1970s.</p><p>Chris has been a passionate advocate for foster care since 2008, starting his journey with our sister agency, Annie’s Havens. Over the years, he’s worn many hats—handling everything from accounting to stepping in as Interim Executive Director from 2011 to 2013.</p><p>But Chris’s connection to foster care goes far beyond his professional experience. Growing up with foster siblings, he saw firsthand the unique challenges they face. This personal experience shaped his deep understanding of what children in foster care truly need: not just services, but genuine love, stability, and a sense of belonging.</p><p>Chris is committed to ensuring every child feels valued and supported, and he brings that passion to everything we do at Safe Harbours.</p>",
}))

# 4 — team (Our Team)
def headshot(slug):
    return "image-set(url('%s/2024/11/%s-393.avif') type('image/avif'), url('%s/2024/11/%s-393.webp') type('image/webp'), url('%s/2024/11/%s.png'))" % (U, slug, U, slug, U, slug)
members = [
    {"bg": headshot("ChrisWilsonFounder-1"), "name": "Chris Wilson", "role": "Founder"},
    {"bg": headshot("MattPearson"), "name": "Matt Pearson", "role": "Case Manager, Classroom Supervisor"},
    {"bg": headshot("MichellePowell"), "name": "Michelle Powell", "role": "Case Manager"},
    {"bg": headshot("JamieMoreau"), "name": "Jamie Moreau", "role": "Director of Service"},
]
blocks.append(("team", {"heading": "Our Team", "members": members, "label": "View Our Career Opportunities", "href": "/careers/"}))

# 5 — testimonials
testimonials = [
    {"quote": "“Safe Harbours provided me with the support and training I needed to become a successful foster parent. I highly recommend their services.”", "author": "Carly T", "role": "Foster Parent"},
    {"quote": "“I can't thank Safe Harbours enough for the care and support they provided for my foster child. They truly made a difference in his life.”", "author": "Ziya C", "role": "Foster Parent"},
    {"quote": "“Safe Harbours is an amazing organization. They provide quality care and services for foster children and families alike.”", "author": "Sarah J", "role": "Foster Parent"},
]
blocks.append(("testimonials", {"items": testimonials}))

# 6 — cta
blocks.append(("cta", {
    "heading": "Ready To Get Started?",
    "body": "<p><strong>Are you ready to make a difference?</strong> Safe Harbours is here to guide you every step of the way. Contact us today to learn more about fostering and how you can get involved. <strong>Your journey to becoming a foster parent begins here…</strong></p>",
    "label": "Get Started", "href": "/become-a-foster-parent/",
}))

# 7 — logos (Referral Partners)
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

print("-- Generated by db/gen-seed-our-story.py — the full Our Story page as blocks.")
print("DELETE FROM content_blocks WHERE page='our-story';")
for pos, (kind, body) in enumerate(blocks):
    j = json.dumps(body, ensure_ascii=False).replace("'", "''")
    print("INSERT INTO content_blocks (page,slot,kind,body,position,state,updated_at) VALUES ('our-story','main','%s','%s',%d,'published','');" % (kind, j, pos))
