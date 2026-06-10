#!/usr/bin/env python3
# Generates db/seed-become.sql — the full Become a Foster Parent page as ordered
# content blocks (slot 'main'), decomposed from the original mirror markup. Run:
#   python3 db/gen-seed-become.py > db/seed-become.sql
import json

U = "/assets/uploads"

def img(avif, webp, jpg, w=None, h=None):
    o = {"avif": avif, "webp": webp, "jpg": jpg}
    if w: o["w"] = w
    if h: o["h"] = h
    return o

blocks = []

# 0 — heroForm
blocks.append(("heroForm", {
    "heading": "Become a Foster Parent",
    "intro": "<p>Becoming a foster parent is a rewarding journey that gives you the opportunity to provide a <strong>safe, stable, and loving home</strong> for children in need. If you’ve ever felt the desire to <strong>make a difference</strong> in a child’s life, fostering may be the perfect way to do so.</p>",
    "bg": "image-set(url('%s/2024/10/shutterstock_1575539629-2-1917.avif') type('image/avif'), url('%s/2024/10/shutterstock_1575539629-2-1917.webp') type('image/webp'), url('%s/2024/10/shutterstock_1575539629-2.png'))" % (U, U, U),
}))

# 1 — steps (How it Works)
def step(frame, w, h, reverse, heading, body):
    return {"reverse": reverse, "heading": heading, "body": "<p>%s</p>" % body,
            "img": img("%s/2024/10/%s-640.avif 640w" % (U, frame), "%s/2024/10/%s-640.webp 640w" % (U, frame), "%s/2024/10/%s.jpg" % (U, frame), w, h)}
steps = [
    step("Frame-34130-2", 834, 468, True, "Interview / Initial Home Survey",
         "We begin with an interview and home visit to get to know you and assess the environment where you’ll be fostering. This informal survey helps us understand your motivation for fostering and ensures your home meets the basic safety requirements."),
    step("Frame-34130-3", 834, 468, True, "Complete and Submit Application Documents",
         "Next, you’ll complete the required application forms, which include background checks, references, and other important documentation. This step ensures that all necessary legal and safety requirements are met."),
    step("Frame-34130-1-e1730335908622", 828, 464, True, "Home Study (Structured Analysis Family Evaluation)",
         "A thorough evaluation of your household is conducted through the Home Study process. This involves interviews, assessments, and home inspections to ensure your family is fully prepared to foster. The study helps us match you with the right child based on your strengths and family dynamics."),
    step("Frame-34130-4", 834, 468, True, "Foster Parent Training",
         "Once your application and home study are complete, you’ll participate in our comprehensive foster parent training. This training covers topics such as trauma-informed care, child development, and behaviour management to equip you with the skills and knowledge needed to provide exceptional care."),
]
blocks.append(("steps", {"heading": "How it Works", "steps": steps}))

# 2 — largeList (Possible Areas of Trauma)
list_items = [
    ("Oppositional Defiance Disorder:", "Persistent disobedience, defiance, or hostility towards authority figures."),
    ("Conduct Disorder:", "A pattern of aggressive, disruptive, or anti-social behaviour."),
    ("Obsessive Compulsive Disorder:", "Repetitive behaviours or thoughts that can impact daily life."),
    ("Fetal Alcohol Spectrum Disorder:", "Developmental challenges due to prenatal alcohol exposure."),
    ("Post-Traumatic Stress Disorder:", "Emotional distress and trauma stemming from past experiences"),
    ("Drug & Alcohol Abuse:", "Struggles with substance use and addiction."),
    ("Encounters with Law Enforcement:", "Previous legal issues or encounters with the justice system."),
    ("Absence Without Leave (AWOL):", "Running away or being absent without permission."),
    ("Stealing, Lying & Hoarding:", "Behaviors that may stem from past trauma or survival instincts."),
]
blocks.append(("largeList", {
    "heading": "Possible Areas of Trauma",
    "items": [{"heading": h, "text": t} for h, t in list_items],
    "label": "Learn About Contact Us", "href": "/contact-us/",
}))

# 3 — safety (Support & Safety)
safety_cards = [
    "<b>Child and Youth Workers:</b><br>Professionals who provide guidance and support for the youth.",
    "<b>Funding for Immediate Psychological Services:</b> Access to mental health resources as needed.",
    "<b>Access to Community Support Programs:</b> Including drug counselors, therapists, and more.",
    "<b>Educational Tutors: </b><br>To support the youth’s academic growth.",
]
blocks.append(("safety", {
    "content": "<h2>Support &amp; Safety</h2><p>The well-being of both the child and the foster family is a top priority at Safe Harbours. Within seven days of a child’s placement, a preliminary assessment will be conducted to identify any additional support needs.</p><h3 class=\"m-h4\"><strong>Our Goal</strong></h3><p>Our goal is to quickly integrate children into a routine whether by enrolling them in school, connecting them with relevant special needs staff, and/or initiating support from community mental health agencies. Based on the assessment, additional support may include:</p>",
    "cards": [{"text": t} for t in safety_cards],
    "important": "<h4><strong>For Immediate Threats</strong></h4><p>If a child’s behaviour threatens the safety of the home or community, we will tap into our resource network to determine next steps.</p><p>In cases of an immediate threat, foster parents are advised to call the police, as maintaining a secure and safe home is essential, even if difficult decisions must be made.</p>",
}))

# 4 — cta
blocks.append(("cta", {
    "heading": "Ready To Get Started?",
    "body": "<p><strong>Are you ready to make a difference?</strong> Safe Harbours is here to guide you every step of the way. Contact us today to learn more about fostering and how you can get involved. <strong>Your journey to becoming a foster parent begins here…</strong></p>",
    "label": "Get Started", "href": "/become-a-foster-parent/",
}))

# 5 — logos (Referral Partners) — same partners as Our Story
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

print("-- Generated by db/gen-seed-become.py — the full Become a Foster Parent page as blocks.")
print("DELETE FROM content_blocks WHERE page='become-a-foster-parent';")
for pos, (kind, body) in enumerate(blocks):
    j = json.dumps(body, ensure_ascii=False).replace("'", "''")
    print("INSERT INTO content_blocks (page,slot,kind,body,position,state,updated_at) VALUES ('become-a-foster-parent','main','%s','%s',%d,'published','');" % (kind, j, pos))
