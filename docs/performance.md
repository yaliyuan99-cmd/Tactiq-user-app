# Performance

Measured, not estimated. Every number here came from a run against the
production build (`npm run build` then `vite preview`), and the method is
written down so the same numbers can be got again.

**Targets.** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 — the Core Web Vitals
thresholds. They are about a real person on a real phone, so the measurement
that counts is the throttled one.

## Method

Chromium through Playwright, against `vite preview` on the production build.
Two conditions:

- **Unthrottled, 1440×900.** Localhost, no latency. Useful only for comparing
  one build with another; it flatters every number.
- **Throttled, 375×812.** Chrome's Slow 4G profile (150 ms RTT, 1.6 Mbps down)
  with a 4× CPU slowdown — roughly a mid-range phone on mobile data. **This is
  the condition the targets are written for**, and the one to quote.

LCP and CLS are read from `PerformanceObserver` with `buffered: true`; FCP from
the paint timeline. INP needs a real interaction and is not covered by this
script — see "Not yet measured" below.

## Results, 1 November 2026

Re-measured after the "Meet the prototype" section was added to `/`. Reported
as a distribution over five runs, not a single number, because this machine
does not go quiet: system processes alone held the load average near 8, and a
single reading taken under that load said 2632 ms when the median is 1576 ms.
One number from a busy machine is not a measurement.

Throttled (Slow 4G, 4x CPU, 375 px), five runs each:

| Route | LCP min | LCP median | LCP max | CLS median | CLS max |
| --- | --- | --- | --- | --- | --- |
| `/` | 1560 ms | **1576 ms** | 3112 ms | 0 | 0.074 |
| `/sign-in` | 1272 ms | **1280 ms** | 1292 ms | 0.0002 | 0.0002 |

Both medians pass the 2.5 s target, and even the worst CLS observed is inside
the 0.1 budget. The ring section did not cost what a single contaminated
reading suggested.

The spread is the interesting part. `/sign-in` varies by 20 ms across five
runs; `/` varies by 1552 ms. The difference is the lazily-loaded body: the
hero is in the entry bundle and paints predictably, while everything below it
arrives on a second request whose timing moves with the machine. The rare
0.074 shift was not reproducible — four further runs recorded no shift at all
— so it is recorded here as observed rather than explained, and it is not
worth a fix that cannot be shown to work.

## Results, 30 October 2026

Throttled (Slow 4G, 4× CPU, 375 px):

| Route | FCP | LCP | CLS | Against target |
| --- | --- | --- | --- | --- |
| `/` (public homepage) | 1032 ms | **2288 ms** | 0 | Passes, with 212 ms to spare |
| `/sign-in` | 1008 ms | 1268 ms | 0.0002 | Passes comfortably |

Unthrottled, for comparison (1440 px):

| Route | FCP | LCP | CLS | Transferred | of which JS |
| --- | --- | --- | --- | --- | --- |
| `/` | 84 ms | 1296 ms | 0 | 465 kB | 363 kB |
| `/sign-in` | 84 ms | 84 ms | 0.0023 | 446 kB | 343 kB |
| `/dashboard` | 76 ms | 100 ms | 0 | 454 kB | 352 kB |

**CLS is effectively zero everywhere.** Nothing on these pages reflows after it
paints, which is what the fixed hand-map geometry and the reserved space in the
shell are for.

## What the homepage is actually waiting for

`/` is the one route near its budget, and the resource timeline says why:

```
  349 ms  theme-init.js
  507 ms  index.css
  843 ms  index.js          (the shared app chunk, 144 kB)
  921 ms  react.js          (177 kB)
 1301 ms  HomePage.js
 1579 ms  inter-latin.woff2
 2903 ms  HomeBody.js       <- a second hop, after HomePage has parsed
```

Two separate costs:

1. **A two-step lazy waterfall.** The router lazily loads `HomePage`, and
   `HomePage` then lazily loads `HomeBody`. The browser cannot begin fetching
   `HomeBody` until `HomePage` has arrived, parsed and rendered — so its cost
   is not its size but a whole extra round trip, and on a slow link the visitor
   sees "Loading the rest of this page…" on the product homepage for over a
   second. The split was meant to make the homepage lighter; measured, it makes
   the homepage slower. Splitting below the fold only pays when the fetch
   starts in parallel.

2. **JS execution under a throttled CPU.** `HomePage.js` is downloaded by
   1301 ms but the hero does not paint until ~2.3 s. The gap is React plus the
   144 kB shared chunk parsing and executing at a quarter speed. Downloading
   less is not the lever here; *running* less is.

## Not yet measured

- **INP.** Needs a real interaction under throttling, and the interaction worth
  measuring is a gesture on the practice surface, where a delay is not a
  nuisance but a wrong reading. Not covered by the current script.
- **Field data.** Everything above is a lab measurement on one machine. There
  is no analytics in the app and no plan to add any, so there will not be field
  data; the lab numbers are what there is, and they should be read as such.
- **The real site.** These are localhost numbers against a local preview. A
  deployed site adds DNS, TLS and CDN latency that localhost cannot show.

## Reproducing

The measurement scripts are deliberately not checked in: they are short, they
depend on a preview server on a fixed port, and a stale copy of a benchmark is
worse than none. To repeat the throttled run:

```bash
npm run build
npx vite preview --port 5190 --strictPort
```

Then drive Chromium through Playwright with
`Network.emulateNetworkConditions` (150 ms latency, 1.6 Mbps) and
`Emulation.setCPUThrottlingRate` at 4, read `largest-contentful-paint` and
`layout-shift` from a buffered `PerformanceObserver`, and record the paint
timeline from `performance.getEntriesByType('resource')`.
