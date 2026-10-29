# Privacy copy for the interface

**Draft for review — not yet in the app.** Companion to
[privacy-policy.md](privacy-policy.md). The policy is the full statement; this
is what people actually read, at the moment it matters to them.

A privacy policy is not a collection notice. The policy explains the whole
picture once; a collection notice tells someone what is about to happen with
what they are typing, where they are typing it. Both are needed, and neither
substitutes for the other.

Every `[CONFIRM: …]` is unresolved — see
[privacy-open-questions.md](privacy-open-questions.md).

---

## 1. The short summary

Target: readable by a 15-year-old, which is also roughly the standard the OAIC
sets for whether a young person can meaningfully consent. Short sentences, no
defined terms, no "we may".

### On the sign-up screen, above the form

> **Your data stays in this browser.**
> Tactiq saves your profile, your practice records and your settings on this
> device only. Nothing is sent to us — there is no account server in this
> version. You can export or delete everything in Settings.
>
> This version does not check passwords. Anyone using this browser can open any
> profile in it.
>
> [Read the full privacy policy](/privacy)

### On the demonstration (`/demo`) entry point

> **Nothing you do here leaves your browser.**
> The demonstration runs a simulated ring on your own device. Your practice
> records are saved in this browser so you can look back at them, and you can
> clear them at any time in Settings.
>
> [Read the full privacy policy](/privacy)

### One-line version, for a footer or a tight space

> Your data stays in this browser. Nothing is sent to us.
> [Privacy](/privacy)

### Accessibility notes for whoever implements these

- The summary is **content, not a dialog**. Do not put it behind a banner, a
  modal or an accordion that has to be opened. It appears above the fields it
  is about.
- No consent checkbox. There is nothing to consent to: the data does not go
  anywhere. A checkbox would imply a transfer that is not happening.
- The link to the full policy is a real link with a real href, not a button
  that opens an overlay, so it can be opened in a new tab, bookmarked and read
  with the page's own reading tools.
- Do not add a cookie banner. There are no cookies.

---

## 2. Collection notices

Short, specific, and placed where the collection happens.

### Email address and display name — on the sign-up form

Beside the fields, as the fields' description:

> Used to tell your profile apart from others on this browser, and to greet you
> by name. Stored on this device. Not sent anywhere, and not checked against
> anything.

### Practice and lesson records — first time practice is opened

Once, in the practice surface, not repeated on every screen:

> Each attempt is saved in this browser: which point you touched, how long for,
> whether it matched, and when. Up to 5,000 attempts are kept. Review or clear
> them in Activity.

### Calibration — on the calibration screen before it starts

> Calibration saves each sample in this browser: the point asked for, the point
> detected, how long the contact lasted, and whether it was accepted. You can
> delete it in Settings.

### Connecting a bench prototype ring — on the Connect screen

> Your browser will ask permission to connect to the ring. The connection is
> between your browser and the ring. Nothing about it is sent to us.

### Spoken announcements — beside the setting, not only in the policy

This one matters more than it looks, and it is the disclosure most likely to be
left out:

> Uses your browser's built-in speech. Some browsers and phones generate
> speech on their own servers, which means the text being read could leave your
> device. Which voices do that is decided by your browser, not by Tactiq.

### Export — on the export button's description

> The file is saved to your device by your browser. Once it is saved, it is
> outside Tactiq, and anyone who can open the file can read it.

### Delete all local data — in the confirmation dialog

> This removes every Tactiq profile, record and setting from this browser.
> It cannot be undone, and we cannot restore it — we never had a copy.
> Export first if you want to keep anything.

---

## 3. If the Supabase account server is ever switched on

None of the copy above survives that change unedited. Before it ships:

- The sign-up summary must stop saying "Nothing is sent to us".
- A collection notice must appear on the sign-up form saying what is sent, to
  whom, and where it is stored — including [CONFIRM: the hosting region, since
  that decides whether it goes overseas].
- The policy's section 7 must be rewritten, and section 2's legal-status
  statement re-examined: taking in personal information on a server is a
  materially different activity from storing it on the user's own device.
- The claim that the app makes no network requests becomes false.

Treat this list as a release blocker on the branch that enables it, not as
documentation to update afterwards.

---

## 4. Wording this copy must not use

Checked against what the build actually does:

| Do not write | Because |
| --- | --- |
| "We don't collect any personal information" | An email address and a display name are personal information, and both are stored. |
| "Anonymous" (of the demo or the records) | The records sit in a profile keyed to an email address the user typed. |
| "Encrypted" / "secure" / "bank-grade" | Browser storage is not encrypted by the app. HTTPS protects the page download and is irrelevant to data that is never transmitted. |
| "Your data is never shared" | A forward-looking promise the dormant account integration is positioned to break. Say what is true now, with a date. |
| "We will delete your data on request" | There is nothing for us to delete. The user deletes it themselves. |
| "We use cookies to improve your experience" | There are no cookies. |
| "Privacy Act compliant" / "GDPR compliant" | A claim about legal status that is false unless it is established and, for the Privacy Act, registered. |
| "You must be 13 or over" | Implies an age check that does not exist. |
| "Biometric", of the ring | Invites a legal characterisation the project has not established and may not want. Say it reports finger-contact events and their durations. |
| "Therapy", "rehabilitation", "clinically proven", "improves outcomes" | Could make this a health service in law — see open question 1, the highest-stakes question in the whole review. |
| "May share with partners" | There are no partners. Vague permissions read worse than the plain truth. |
