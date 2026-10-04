# Tactiq user app

The app a Tactiq user opens to connect the ring, calibrate it, learn the commands,
customise shortcuts, practise gestures, review activity and manage settings.

Tactiq is an assistive smart-ring concept for blind and low-vision smartphone users.
A deliberate squeeze of the ring opens a short command window. The thumb touches one
of eight contact points on the same hand. The phone would carry out the mapped command
through VoiceOver or TalkBack, and a haptic pattern would confirm it.

## What is real and what is not

- **No finished wearable ring exists.** A bench prototype firmware and a simulation
  pipeline exist in the separate research repository. Nothing has been validated on a
  worn device, and no participant data exists.
- **The app is fully usable in Demo Mode.** A simulated ring runs the same squeeze,
  window, tap and hold rules as the bench firmware. Every result it produces is labelled
  **Simulated**.
- **Thresholds are labelled Design target.** For example, at least 95% per-contact
  accuracy and at most one false activation per hour. They were fixed before testing and
  are not results.
- **The emergency command never contacts anyone.** Completing the five-second hold shows
  "Simulation only — no emergency message was sent."
- **Battery is never shown as a number.** The bench firmware sends a fixed placeholder,
  not a reading.
- **Bluetooth values come from the research repository.** The device name and the
  Nordic UART Service UUIDs match `docs/PROTOCOL.md` there. A bench ring connected over
  Web Bluetooth produces records labelled **Measured (bench prototype)**.

## Command map

| Contact point | Touch | Command | Type |
| --- | --- | --- | --- |
| Index fingertip | Brief tap | Confirm | Fixed |
| Index finger base | Brief tap | Dismiss / Back | Fixed |
| Middle fingertip | Brief tap | Undo | Fixed |
| Middle finger base | Brief tap | Next | Fixed |
| Ring fingertip | Brief tap | Read / Repeat | Fixed |
| Ring finger base | Brief tap | Previous | Fixed |
| Pinky fingertip | Brief tap | Shortcut 1 | Customisable |
| Pinky finger base | Brief tap | Shortcut 2 | Customisable |
| Pinky fingertip | Hold 5 seconds | Emergency | Fixed, never remappable |

A tap lasts at most 500 ms. A press longer than a tap but shorter than the emergency hold
is dropped, never guessed. The command window lasts 3 s, as set by the bench firmware.
Longer interaction time extends it to 6 s in Demo Mode only.

## Run it locally

Requires Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5187. Choose **Continue as a guest** on the sign-in screen, or create
a local profile, and follow the setup. No backend is needed.

### Checks

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript, strict
npm test            # Vitest unit and component tests
npm run build       # Type-check and production build to dist/
```

Browser and accessibility tests use Playwright with Chromium, at 1440 px desktop and
375 px mobile:

```bash
npm run test:e2e:install   # once: downloads Chromium
npm run test:e2e           # all end-to-end specs, starts a dev server on port 5188
npm run test:a11y          # axe accessibility scans only
```

### Optional real accounts

Without configuration, accounts run in Demo Mode. Profiles live in this browser, and no
password is stored or checked; the sign-in screen says so. To use real email and password
accounts, create a Supabase project, copy `.env.example` to `.env`, fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and restart the dev server.

### Connecting a bench ring

Choose **Bluetooth ring (bench prototype)** on the Connect screen. Web Bluetooth needs
Chrome or Edge on desktop or Android, over https or localhost. The ring must be flashed
with `firmware/tactiq_ring_ble` from the research repository. The browser asks for
Bluetooth permission only after you choose **Connect a ring**.

## Screens

| Route | Purpose |
| --- | --- |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Accounts (Demo Mode or Supabase) |
| `/onboarding` | Eight-step setup: welcome, accessibility, hand, device, calibration, feedback, first lesson, done |
| `/dashboard` | Home: next step, ring status, training, calibration, commands, recent activity |
| `/dashboard/connect` | Demo Mode or Bluetooth; every connection state, reconnect and forget |
| `/dashboard/calibrate` | Voice-guided calibration of all eight points, three taps each |
| `/dashboard/train` and `/dashboard/train/:lessonId` | Five lessons, from the squeeze to the emergency hold |
| `/dashboard/simulator` | Guided and free practice with a hand view and a list view |
| `/dashboard/commands` | The command map, and editing the two shortcuts |
| `/dashboard/history` | Filters, performance by command, recent attempts, export and clear |
| `/dashboard/settings` | Appearance, feedback, timing, hand, device, calibration, privacy, account, about |
| `/dashboard/help` | Getting started, practising, accessibility, troubleshooting, limitations |

On desktop the sidebar holds every destination. On mobile, a bottom bar holds Home,
Train, Simulator, Commands and Settings. Connect, Calibrate, History and Help are in the
**More** menu, and Help is also in the top bar on every screen.

## Architecture

```
src/
  domain/        Typed product facts: contact points, commands, timing, evidence labels,
                 Bluetooth protocol, lessons, onboarding steps, and the data models
  services/      Infrastructure behind interfaces, so screens never touch storage or Bluetooth
    storage/       StorageAdapter (localStorage, or in-memory for tests)
    preferences/   Theme, text size, contrast, motion, feedback, timing, hand, onboarding
    auth/          AuthService: LocalDemoAuthService, or SupabaseAuthService when configured
    device/        DeviceAdapter: MockDeviceAdapter (the simulated ring, RingStateMachine)
                   and WebBluetoothDeviceAdapter (Nordic UART, bench firmware line protocol)
    history/       Gesture events, filters, summaries, CSV and JSON export
    calibration/   Calibration profile and coverage
    training/      Lesson progress
    commands/      Shortcut mapping (only Shortcut 1 and 2 can change)
    feedback/      Live-region announcements, optional speech and vibration
    demo/          Seeded, labelled sample history for Demo Mode
  components/    Accessible building blocks: buttons, fields, dialogs, tables, evidence labels,
                 and the line-drawn HandMap with its ContactList alternative
  features/      One folder per screen, plus practice/, the shared ring interaction core
                 used by the simulator, lessons, calibration and onboarding
  app/           Router, route guards, app shell, navigation, focus management
  design-system/ Tokens ported from the Tactiq website, plus dark and high-contrast themes
```

Key decisions:

- **One event stream for simulated and real rings.** The mock adapter emits the same gate,
  token and reject events a bench ring sends. Practice screens therefore work unchanged
  when hardware replaces the simulation.
- **Truthfulness lives in data, not just copy.** Every gesture event carries `evidence`
  (`simulated` or `measured`) and a `seeded` flag. The battery model cannot hold a number
  from the stub firmware. The shortcut service rejects any attempt to remap a fixed
  command.
- **No gesture-only interaction.** Every contact point is a real button that works with
  pointer, touch and keyboard, and the list view offers the same commands. The five-second
  hold has a toggle button for screen-reader and switch users.
- **Local-first Demo Mode.** Preferences, calibration, lessons, shortcuts and history
  persist in `localStorage` under the `tactiq.` prefix. Users can export or delete them in
  Settings.

## Accessibility

The target is WCAG 2.2 AA. The app provides:

- landmarks, one h1 per page, and focus moved to the page heading on navigation
- a skip link and a visible focus ring
- targets of at least 44 × 44 px
- live-region announcements for connection, calibration and command results
- no information conveyed by colour alone
- reduced motion, via the operating system setting or the in-app setting
- light, dark and high-contrast themes
- three text sizes
- layouts that reflow at 320 px and at 200% zoom

The Playwright suite runs axe on every route in all four themes and checks overflow,
target size and focus visibility.

## Deployment

`netlify.toml` builds with `npm run build`, publishes `dist/`, adds a single-page-app
fallback and sets security headers. Its `Permissions-Policy` allows only Bluetooth.
