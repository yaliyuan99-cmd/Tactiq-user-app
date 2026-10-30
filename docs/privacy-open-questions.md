# Privacy: what is unresolved

Companion to [privacy-policy.md](privacy-policy.md) and
[privacy-notices.md](privacy-notices.md). **Neither should be published until
the questions in part A are answered.**

Three separate kinds of thing are listed here and should not be confused:

- **Part A — facts nobody has established.** Blanks in the draft.
- **Part B — questions for a lawyer.** Genuinely unresolved on the law.
- **Part C — gaps in the app.** Things the code would have to do before the
  policy's claims are all true.

Compiled 30 October 2026 from the project's own code and from Australian
privacy law research carried out the day before. **Nobody involved in writing
this is a lawyer, and none of it is legal advice.**

---

## Part A — facts to establish before publishing

Each one appears as a `[CONFIRM: …]` placeholder in the drafts.

| # | Fact | Where it appears | Who can answer |
| --- | --- | --- | --- |
| A1 | The operator's legal name, and whether the responsible entity is an individual, the school, or something else | Policy §1, §2 | Project owner, with the school |
| A2 | A role-based contact email that is not a personal address | Policy §11, notices | Project owner |
| A3 | A postal address that is **not a student's home address** | Policy §11 | The school, with its agreement |
| A4 | A role title for the contact point | Policy §11 | Project owner |
| A5 | A response time for privacy questions that can actually be met | Policy §11 | Project owner |
| A6 | Netlify's current privacy policy URL and log retention period, **read from Netlify's own documentation** | Policy §5 | Project owner. Do not state a period until it has been read |
| A7 | Whether any aggregate or anonymised figures from users' own practice will be reported in a write-up, science-fair entry or presentation, and in what form | Policy §6 | Project owner. Easy to overlook and a real disclosure |
| A8 | If Supabase is ever enabled: the hosting region | Policy §7, notices §3 | Whoever configures it |
| A9 | Whether to opt in under s 6EA, and therefore whether the OAIC complaint path can be named | Policy §2, §11 | Lawyer, then project owner — see B6 |

---

## Part B — questions for a lawyer

Ranked by consequence. The first three decide most of the rest.

### B1. Is this a "health service" holding "health information"? ⚠️ Highest stakes

Everything else follows from this one. If the project provides a health service
*and* holds health information, **s 6D(4)(b)** removes the small-business
exemption **regardless of having no income**: the project becomes an APP
entity bound by all thirteen Australian Privacy Principles, by APP 3.3 (consent
required before collecting sensitive information), and by the Notifiable Data
Breaches scheme — and, in NSW, by the HRIP Act.

The live text is **s 6FB(3)(b)**: an activity that takes place *in the course
of providing care for a person with a disability* is a health service. And
**s 6FB(1)** is satisfied by what is *intended or claimed, expressly or
otherwise* — including by the user.

The defensible characterisation is that this is **training in the use of a
consumer input device**, no more a health service than teaching someone a
keyboard shortcut. The project's own words can decide this against it:
"rehabilitation", "therapy", "improves independence as a health outcome",
"prescribed by a clinician" all feed the opposite reading. The wording table in
[privacy-notices.md](privacy-notices.md) §4 exists for this reason.

- *Privacy Act 1988* (Cth) ss 6FA, 6FB, 6D(4)(b) —
  https://www.legislation.gov.au/C2004A03712/latest/text
- OAIC APP Guidelines Chapter B (health information, B.77–B.81) —
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts/

### B2. Does a record that an identified person used a blind/low-vision assistive interface say something about their disability?

**s 6FA(a)(i)** covers information or an opinion about "the health, including
an illness, **disability** or injury, (at any time) of an individual" that is
also personal information. The app stores an email address and a display name,
so the records are about an identifiable person, and the product is a blind and
low-vision assistive interface. OAIC says information may be sensitive where it
**clearly implies** one of the listed matters (Chapter B, B.142).

Arguable both ways. Against the inference: sighted developers, testers, judges
and curious visitors use the app too, so usage is not a reliable proxy for
anything. For it: the inference is the obvious one a reader would draw.

Worth putting to the lawyer alongside a mitigation: whether the records need to
be tied to a named profile at all, rather than an opaque local identifier.

### B3. Does anything stored amount to a "biometric template"?

**s 6(1)(e)** makes biometric templates sensitive information **with no purpose
qualifier** — so "we only use it to score lessons" does not answer it.
Neither "biometric information" nor "biometric template" is defined anywhere in
the Privacy Act or in OAIC's APP Guidelines. There is no textual answer to look
up, which is why this needs a lawyer rather than more reading.

What the code actually persists, which is what the lawyer should see:

- `GestureEvent` (`src/domain/models.ts`) — per attempt: timestamp, contact
  point asked for and detected, command, **duration in milliseconds**, outcome,
  source, lesson. Capped at 5,000 per profile.
- `CalibrationProfile` and `CalibrationSample` (same file) — per contact point,
  several samples, each with **duration in milliseconds**, the detected point,
  and whether it was accepted.

The calibration profile is the sharper question. A per-trial log is probably
not a stored reference pattern; **a per-user calibration profile might be**, and
limb (e) does not care what it is for.

Points away from the limbs: the purpose is lesson scoring, not identifying
anyone; much of the input is touch, pointer or **keyboard** on a screen, which
is an interaction record rather than a measurement of a body; there is no
camera, image capture or vision model anywhere.

Points toward them: dwell-time and timing patterns are treated as behavioural
biometrics in the research literature (keystroke dynamics being the classic
case), and whether millisecond contact durations are "biometric information"
has no settled answer here.

Note the EU test is **different** and an answer does not transfer: GDPR
Art 4(14) and Art 9(1) both have a unique-identification gate that the
Australian limb (e) lacks.

- *Privacy Act 1988* (Cth) s 6(1) "sensitive information", APP 3.3 —
  https://www.legislation.gov.au/C2004A03712/latest/text
- OAIC facial recognition guidance (the closest official description of a
  biometric template, though about a different technology) —
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/facial-recognition-technology-a-guide-to-assessing-the-privacy-risks

### B4. Where is the boundary between the student's project and the school's activity?

A NSW government school is bound by both the PPIP Act and the HRIP Act; an
individual student is bound by neither. Hosting, the domain, the published
contact address, participant recruitment, consent forms and sponsorship all
move the line. This interacts directly with A1 and A3.

- *Privacy and Personal Information Protection Act 1998* (NSW) —
  https://legislation.nsw.gov.au/view/html/inforce/current/act-1998-133
- *Health Records and Information Privacy Act 2002* (NSW) —
  https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-071

⚠️ Both NSW links blocked automated retrieval during research, so the HRIP Act
s 4 "private sector person" definition and s 11 application provision were
**not read first-hand**. The exclusion of Commonwealth "small business
operators" is the load-bearing element. Read it directly.

### B5. Is the project "carrying on a business" at all?

This decides *which* reason the policy should give for the Privacy Act not
applying — s 6D (the turnover test), or s 7B(1) / s 16 (an individual acting
outside a business, and personal/family/household affairs). The practical
answer is the same either way, but **the policy should state the right reason**,
and §2 of the draft is blank until this is settled.

### B6. Is opting in under s 6EA net-positive?

It is a public, registered commitment that makes all thirteen APPs legally
enforceable and brings the project within OAIC's complaint, investigation and
civil penalty jurisdiction. Two things make it less reversible than it looks:

- Acts that occurred while on the register can still be complained about
  **after opting out**.
- Once the Children's Online Privacy Code is registered, it binds **APP
  entities** — so opting in could pull the project into that Code too (see B8).

A privacy policy is a precondition: applications without one are declined.

- https://www.oaic.gov.au/privacy/privacy-registers/privacy-opt-in-register/opting-in-to-the-privacy-act/

### B7. Does the Australian Consumer Law reach this project?

*Competition and Consumer Act 2010* Sch 2 s 18 (misleading or deceptive
conduct) applies to conduct "in trade or commerce", which for an unfunded
student project is arguable. It decides whether a false security or compliance
claim carries legal consequences on top of reputational ones. The ACCC's
position is that claims must be accurate and based on reasonable grounds, and
that **intent is irrelevant**.

- https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims

### B8. Children's Online Privacy Code

Due to be registered by **10 December 2026** — about six weeks from the date of
this document. It binds APP entities providing a service **likely to be
accessed by children**. That is an objective test: a terms-of-use disclaimer
does not take a service outside it, and a school project shown at a school is,
realistically, likely to be accessed by children.

It does not bind the project today. It would the instant the project became an
APP entity — including by opting in (B6). **Re-check the register before
publishing**, and watch for the Commissioner's s 26GC(11) guidelines.

### B9. Can a minor be an "organisation" or "small business operator"?

The Act sets no minimum age: s 6C(1)(a) says "an individual". No OAIC guidance
on a minor as the *operator* of a regulated service was found, as opposed to a
minor as a data subject. Untested. Related and more practical: **capacity to
contract** — who should be the named, accountable party for any binding
commitment (opting in, a hosting contract, a backend provider's terms,
competition entry conditions)?

Note separately that the **statutory tort of serious invasion of privacy**
(Privacy Act Schedule 2, in force since 10 June 2025) is **not** subject to the
small business exemption, and a minor can be a defendant in tort like anyone
else.

### B10. Does purely client-side processing count as collecting or holding?

Unresolved both ways. Nothing the user does reaches the operator. Whether that
is "collects" or "holds" under the Privacy Act, or "processing" under the GDPR,
had no official guidance either way in the research. The drafts take the
conservative line — describing the data as collected and holding the project to
APP-shaped practice — which is safe whichever way this lands.

### B11. School and competition conditions

Science-fair and school-project entry rules commonly impose their own
requirements about human participants, consent and data, and may be stricter
than the Privacy Act. These were **outside the research scope** and have not
been read.

⚠️ If the project ever recruits test participants — above all **child**
participants — that is a different and more serious exercise: parental consent,
the OAIC's capacity analysis (Chapter B, B.59–B.61), and in all likelihood
school ethics or research approval. Raise it with the school **before** any
user testing, not after.

---

## Part C — gaps in the app

Things the code would have to do before everything the policy says is true, or
before the policy stops needing a caveat.

| # | Gap | Why it matters | Effort |
| --- | --- | --- | --- |
| C1 | **There is no `/privacy` route.** Both drafts link to one. | The policy is unreachable, and OAIC's APP 1.5 expectation is that a policy is available free of charge on the website. | Small — a route and a page |
| C2 | **The collection notices in [privacy-notices.md](privacy-notices.md) §2 are not in the app.** | A policy is not a collection notice. These are the part users actually read. | Small to medium, spread over several screens |
| C3 | **Spoken announcements do not warn that some browsers synthesise speech on a server.** | The only way text can currently leave the device, and the single most likely omission. Off by default, which limits the exposure but does not remove it. | Small — copy beside the setting |
| C4 | **"Delete all local data" cannot clear Supabase's own auth token.** The control already clears every `tactiq.` key whether or not `signOut()` succeeds, and tells the user to sign out from Account when it fails — so the user's records do go. What it cannot reach is the token `supabase-js` keeps under its own `sb-…-auth-token` key, which would survive a failed sign-out. Only matters once Supabase is enabled. | The policy says deletion removes everything in the browser. With Supabase on, that would be very slightly untrue. | Small — remove the client's own key explicitly, or state the limit in the dialog |
| C5 | **The site's `Content-Security-Policy` already allows `connect-src https://*.supabase.co`** while the integration is dormant. | Harmless today, but it is the kind of detail that makes "no third-party requests" look less categorical than it is. Consider narrowing it until the integration is enabled. | Small, but check it does not break the enablement path |
| C6 | **Exported files carry the email address and display name.** | True and disclosed, but worth a deliberate decision: an export meant for sharing could omit them. | Medium — an export option |
| C7 | **Records are keyed to a named profile.** | B2's mitigation. Whether an opaque local identifier would do instead is a design question worth answering before the policy is published, because it would change what the policy has to say. | Large — storage and migration |
| C8 | **No release check ties data-handling changes to a policy update.** | APP 1.3's "up to date" expectation, and the reason §7 of the policy carries a date. A checklist item or a CI check on the files that define what is stored. | Small |

---

## What was verified in the code, and is safe to state

These were checked against the source on 30 October 2026 and are the factual
backbone of the drafts. Re-check them before publishing, and after any
dependency or hosting change.

- **No network calls of any kind in the app source** — no `fetch`,
  `XMLHttpRequest`, `sendBeacon`, `WebSocket` or image ping outside tests.
- **No cookies.** `document.cookie` appears nowhere.
- **Fonts are self-hosted** (`src/design-system/fonts/`), so no font service is
  contacted. This is what makes the "no third-party requests" claim true, and
  it is a recent change — the claim was false before it.
- **Supabase is dormant**: no `.env` file exists, so `IS_SUPABASE_CONFIGURED`
  is false and `createAuthService` returns the local service. The Supabase
  client is created lazily and is never reached.
- **`sessionStorage` holds one thing**: the hand-view/list-view choice
  (`tactiq.practiceView`). The guest profile is in `localStorage` like any
  other profile.
- **Spoken announcements are off by default** (`DEFAULT_PREFERENCES`).
- **Camera, microphone and location are blocked at the hosting layer** by
  `Permissions-Policy` in `netlify.toml`; only Bluetooth is allowed.
- **The history cap is 5,000 entries** (`HISTORY_CAP`).
- **Local sign-in checks nothing** — no password is stored or compared.

---

## Sources

All accessed 29–30 October 2026.

**Legislation**

- *Privacy Act 1988* (Cth), compilation in force from 4 June 2026 —
  https://www.legislation.gov.au/C2004A03712/latest/text
- *Privacy and Other Legislation Amendment Act 2024* (Cth) No. 128, 2024 —
  https://www.legislation.gov.au/C2024A00128
- *Competition and Consumer Act 2010* (Cth) Sch 2 (Australian Consumer Law) —
  https://www.legislation.gov.au/C2004A00109/latest/text
- *Privacy and Personal Information Protection Act 1998* (NSW) —
  https://legislation.nsw.gov.au/view/html/inforce/current/act-1998-133 ⚠️ not retrieved
- *Health Records and Information Privacy Act 2002* (NSW) —
  https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-071 ⚠️ not retrieved
- Regulation (EU) 2016/679 (GDPR) —
  https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng ⚠️ not retrieved

**OAIC**

- Small business —
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business
- Opting in to the Privacy Act —
  https://www.oaic.gov.au/privacy/privacy-registers/privacy-opt-in-register/opting-in-to-the-privacy-act/
- APP Guidelines Chapter 1 (APP 1), version 2.0, updated 30 September 2026 —
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information
- APP Guidelines Chapter B (key concepts) —
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts/
- Guide to developing an APP privacy policy —
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/more-guidance/guide-to-developing-an-app-privacy-policy
- Facial recognition technology: assessing the privacy risks —
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/facial-recognition-technology-a-guide-to-assessing-the-privacy-risks
- About the Notifiable Data Breaches scheme —
  https://www.oaic.gov.au/privacy/notifiable-data-breaches/about-the-notifiable-data-breaches-scheme

**ACCC**

- False or misleading claims —
  https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims
