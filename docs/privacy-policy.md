# Tactiq Privacy Policy

**Draft for review — not yet published.** Every `[CONFIRM: …]` below is a fact
nobody has established yet. The policy must not go live with any of them left
in. See [privacy-open-questions.md](privacy-open-questions.md) for the legal
questions that have to be answered first.

**Version 0.1 (draft). Written 30 October 2026. Describes the build as at 30 October 2026.**

---

## In short

Tactiq keeps what you do in your own browser. It does not send your profile,
your practice records or your settings anywhere — there is no account server
and no analytics in this build. You can export everything as a file, and you
can delete it. If you clear your browser's storage, it is gone, and we cannot
get it back for you, because we never had it.

The rest of this page says exactly what is stored, where, and why. It is
longer than the summary because the detail is the point.

---

## 1. What Tactiq is

Tactiq is a **student research project**, not a company and not a product you
can buy. It is an app for practising a finger-worn input interface: you squeeze
a ring, touch one of eight points on the same hand with your thumb, and a
command runs.

**There is no finished ring.** A bench prototype exists in a separate research
repository. Nothing has been tested on a worn device and no participant data
exists. Unless the app labels something **Measured**, what you see is a
simulation running on your own device.

Tactiq is **training in how to use an input device**. It is not a health,
medical, therapeutic or rehabilitation service, it does not assess or diagnose
anything about you, and it makes no claim about your health.

[CONFIRM: the operator's legal name, and whether that is an individual, the
school, or another entity — see open question 4.]

---

## 2. Where this policy stands legally

[CONFIRM: whether the Privacy Act 1988 (Cth) applies to this project, and if
not, the correct statutory reason. The candidates are the small business
operator exemption (ss 6C, 6D), or s 7B(1) / s 16 for an individual acting
outside a business. The reason stated here must be the right one, and it turns
on open questions 1–3.]

What this policy **does not** claim:

- It does not say Tactiq is "Privacy Act compliant", "APP compliant" or "GDPR
  compliant". Those are claims about legal status.
- It does not promise to notify you "under the Notifiable Data Breaches
  scheme". That scheme does not bind this project, and — because your data is
  on your device and never reaches us — we would have no way to know if your
  device were compromised.

What it does commit to: following the **Australian Privacy Principles as a
matter of practice**, because they are a sensible standard, and saying plainly
where practice and law differ.

[CONFIRM: whether to formally opt in under s 6EA of the Privacy Act. Opting in
is a public, registered commitment that makes all 13 APPs enforceable. See
open question 6 — it is not a free reputational win.]

---

## 3. What is stored

### Your profile

When you create a profile, Tactiq stores the **email address** and **display
name** you type, the time the profile was made, and an identifier generated for
it. These are stored in your browser.

**In this build, signing in does not check anything.** No password is stored
and none is checked. Typing a known email address is enough to open that
profile. The sign-in screen says so. **Treat a local profile as a way to keep
your own records separate on your own device, not as a lock.** Anyone who can
use your browser can open any profile in it.

### Your practice records

Each attempt is recorded as one entry:

- the time it happened
- which of the eight contact points was asked for, and which was detected
- the command it mapped to
- how long the contact lasted, in milliseconds
- whether it was accepted, and if not, why
- which lesson or exercise it belonged to, if any
- whether it came from the simulation or from a bench prototype ring
- whether it is one of the seeded sample records

Up to **5,000 entries** are kept per profile. Past that, the oldest go first.

### Your calibration

If you run calibration, Tactiq stores the samples it collected: for each
contact point, when the sample was taken, how long the contact lasted, which
point was detected, and whether it was accepted.

### Your settings

Appearance settings — theme, text size, contrast, reduced motion — are stored
for **this browser**, and shared by every profile in it, because they describe
the screen in front of you. Everything else — which hand, audio announcements,
on-screen confirmation, vibration, longer interaction time, and how far through
setup you are — is stored **per profile**.

Your choice of hand view or list view is kept for the current tab only, and is
forgotten when you close it.

### Which ring this browser used

If you connect a bench prototype ring, the browser remembers which device it
was and whether the app is in Demo Mode. That is stored for the browser, not
for a profile.

---

## 4. What is not collected

As at **30 October 2026**, in the build this policy describes:

- **No camera, microphone or location.** The app never asks for them, and the
  site's own `Permissions-Policy` header blocks all three outright.
- **No photographs, video, or images of you or your hands.** There is no
  computer vision anywhere in the app.
- **No analytics, no advertising, no tracking, no profiling, no error
  reporting.**
- **No cookies.** The app sets none.
- **No date of birth, age, gender, vision status or disability status.** You
  are never asked, and there is no field for any of it.
- **No password**, in the local-profile mode this build runs in.
- **No contact list, no address book, no files from your device.**

The app makes **no network requests of its own at all**. The fonts are served
from this site, not from a font service. There is no request to any third party
anywhere in the running app.

---

## 5. Where it is stored, and who can reach it

Everything above is stored in your own browser, using `localStorage` (and, for
the hand-view/list-view choice only, `sessionStorage`). It stays on the device
you used. Another browser, another device, or a private window shows you
nothing.

**This storage is not encrypted by the app.** Anyone who can use your browser
profile — or read it off the device — can read it. We say this plainly rather
than describing security measures that do not exist.

Because the data never leaves your device:

- we cannot see it
- we cannot retrieve it for you
- we cannot correct it for you
- we cannot delete it for you
- we cannot restore it if you lose it

That is the trade. The export button exists so that the copy on your device is
not the only one you can ever have.

### The website itself

The site is static files served by **Netlify**, a hosting provider. Like any
web host, Netlify receives the ordinary information a browser sends to fetch a
page — including your **IP address**, the pages requested, and your browser's
user-agent string — and keeps server logs of it. That is hosting infrastructure,
not something Tactiq collects or reads, and it is separate from everything in
section 3. Netlify's own privacy terms govern it.

[CONFIRM: Netlify's current privacy policy URL and log retention period, read
from Netlify's own documentation rather than assumed. Do not state a retention
period here until it has been read.]

### If you connect a bench prototype ring

The ring connects over Web Bluetooth, directly between your browser and the
ring. The browser asks your permission first, and only after you choose
**Connect a ring**. Nothing about that connection goes to us or to anyone else.

### If you turn on spoken announcements

Spoken announcements are **off by default**. If you turn them on, the app uses
your browser's own speech feature to read text aloud. **On some browsers and
operating systems that feature sends the text to be spoken to the voice
provider's servers** to generate the audio. Which voices are local and which
are not is decided by your browser and operating system, not by Tactiq. If that
matters to you, leave spoken announcements off, or check which voices your
system uses.

---

## 6. What it is used for

Only to run the app for you:

- to tell your profile apart from another on the same browser
- to show you where you are up to
- to run and score lessons and practice
- to let you review your own activity
- to remember your settings

It is not used for research, for a competition entry, for a demonstration, or
for anything else. [CONFIRM: whether any aggregate or anonymised figures from
your own use will ever be reported in a project write-up, science fair entry or
presentation. If yes, say exactly what form that takes and whether it could be
traced back to a person. If no, delete this bracket and keep the sentence
above.]

---

## 7. Who it is shared with

**As at 30 October 2026, this build transmits nothing to anyone.** There is no
server to receive it, no third-party service in the app, and no overseas
recipient — because there is no recipient at all.

That is a statement about this build on this date, not a promise about every
future version. Which brings us to:

### The account server that is not switched on

The code includes an **optional** integration with Supabase, a hosted database
and account service, for real email-and-password accounts. **It is not
configured and not running.** With no configuration present, the app uses local
browser profiles and the integration is never reached.

We are telling you about it because it exists in the code, because the site's
security policy already permits a connection to it, and because leaving it
unmentioned would make section 7 misleading rather than merely incomplete.

**If it is ever switched on, this policy will be updated before that happens**,
and it will say what is sent, to whom, where it is stored, and what it means
for the statements above. [CONFIRM: if Supabase is enabled, the region the
project is hosted in, since that determines whether data goes overseas.]

---

## 8. How long it is kept

Until you delete it, or until your browser's storage is cleared — by you, by
your browser, or by your operating system reclaiming space. Practice records
are additionally capped at 5,000 per profile, after which the oldest are
dropped.

We do not set a retention period, because we hold nothing to retain.

---

## 9. Your data, and what you can do with it

In **Settings**, you can:

- **Export** your activity as a file (CSV or JSON) and keep it yourself
- **Clear** your activity
- **Delete all local data** for this browser
- **Correct** your display name and email, and change every setting

Because everything is on your device, these are the real controls — not a
request form we respond to. If you want a copy of your data, you do not have to
ask us: export it.

If you believe something the app recorded about you is wrong, you can correct
it or delete it yourself. We cannot do it for you, because we cannot see it.

---

## 10. Children and young people

Tactiq is intended for people learning to use the interface and for people
following the research. **No age verification is performed**, and no age or
date of birth is collected. We are not claiming an age gate exists, because
none does.

The protection that actually applies to a young person using this app is the
same one that applies to everyone: nothing is transmitted, nothing is tracked,
there is no advertising, and the only things identifying a profile are an email
address and a display name the user typed in themselves.

---

## 11. Questions and complaints

If you have a question about privacy, or think something here is wrong or
misleading, contact:

- **[CONFIRM: role title — for example "Tactiq project contact", not a personal name]**
- **[CONFIRM: a role-based email address that is not a personal address]**
- **[CONFIRM: a postal address. Do not publish a student's home address. The
  school's address, with the school's agreement, is the usual answer.]**

We will reply within [CONFIRM: a response time that can actually be met].

[CONFIRM: whether to name an external complaints path. If the project is not an
APP entity and has not opted in, the OAIC cannot hear an Australian Privacy
Principles complaint about it, and this policy must not imply otherwise. If it
opts in under s 6EA, the OAIC path applies and should be stated. See open
question 6.]

---

## 12. Changes

This policy describes a build that is still being developed. If what the app
does with your data changes, **this policy is updated before the change ships**,
and the version and date at the top change with it.

| Version | Date | Change |
| --- | --- | --- |
| 0.1 (draft) | 30 October 2026 | First draft. Not published. |
