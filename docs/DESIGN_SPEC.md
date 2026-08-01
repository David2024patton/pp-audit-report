---
title: "Audit Command Center — Design Specification"
tags: [design, audit-site, patriot-pest, ui]
status: active
created: 2026-07-31
owner: Rockwell
---

# DESIGN SPEC // audit.patriotpest.pro

Interactive audit command center. Static HTML/CSS/JS, zero framework, zero build
step. Renders live from the JSON data layer in /data.

## Identity (frozen — do not remap)

The app's tactical identity, carried over verbatim. Source of truth:
patriot-pest-app/public/assets/styles.css.

```json
{
  "color": {
    "ink": "#141a10",
    "olive-950": "#0e130a",
    "olive-900": "#1c2415",
    "olive-800": "#26301c",
    "olive-700": "#334024",
    "olive-500": "#5c6f3a",
    "olive-300": "#8fa05e",
    "khaki": "#c8b98c",
    "paper": "#ece4cd",
    "orange": "#f4772e",
    "orange-hot": "#ff8c3b",
    "red": "#c8402a",
    "cream": "#f5f1e4"
  },
  "severity": {
    "critical": "#c8402a",
    "high": "#f4772e",
    "medium": "#d9b64a",
    "low": "#8fa05e"
  },
  "type": {
    "display": "Black Ops One",
    "body": "Barlow",
    "mono": "IBM Plex Mono"
  }
}
```

Severity ramp is derived from the identity: critical = brand red, high = brand
orange, medium = a desaturated amber that stays in the olive family, low =
olive-300. All four clear WCAG contrast against the olive-950 field for the
badge text treatment used (ink on fill).

## Structure (four plates)

1. **Scorecard console** — opens the page. Six domain dials render from
   scores.json. Numeric domains get an SVG ring that sweeps and a count-up
   numeral on first intersection. Security (score=null) gets a segmented
   severity bar instead of a ring. Subscores render as inline meters.
2. **Verdict transmission** — "the machine is built, it is not turned on."
   Two panels: what holds (do_not_regress) vs what sleeps (zero counters that
   count up). Scroll story framing.
3. **Findings explorer** — filter chips for severity / owner / gate / status,
   each with live counts. Rows expand to a detail card: summary, impact,
   redacted bar (if redacted), ruling note, cross-ref jump tags.
4. **Launch sequence** — six gates from gates.json with per-item checklists,
   progress meters, LED status, hard rule, and go-now list.

## Redaction behavior

Findings with redacted=true render summary + impact (both public-safe) and a
dashed red "technical detail sealed" bar. When a finding flips to fixed,
redacted flips false and the bar disappears on next fetch. No rebuild.

## Motion

- Easing: cubic-bezier(.22,1,.36,1).
- Scroll reveals: 26px rise, 650ms, staggered via data-d.
- Dial sweep + count-up: 1400ms ease-out on first intersection.
- Ambient: grid + topo + grain + slow scanline. All GPU-cheap.
- All motion disabled under prefers-reduced-motion; reveals resolve instantly.

## Accessibility

- Skip link, visible focus ring (3px orange, 2px offset).
- All interactive elements are real buttons/links; expand/collapse uses
  aria-expanded + aria-controls.
- Severity is never conveyed by color alone (text label on every badge).
- Filters are fieldset/legend groups with aria-pressed chips.
- Live region on the findings count.
- Mobile-first breakpoints at 600 / 620 / 760 / 820 / 860 / 960.

## Deployment note for Edison

Serve /src as the web root. /data must be reachable at ../data relative to the
HTML (i.e. sibling of src). Two options: serve the repo root with /src as
document root and an alias, or copy src+data into the container and set the
fetch base. The fetch base is a single constant in js/app.js (var base).

## Structure (fifth plate, added 2026-08-01)

5. **Competitor intel plate**: renders from data/competitors.json (Nash's
   frozen contract, PR #2). Crawl-backed only. Two states:
   - SIGNAL DARK: file missing, validation_status pending or failed. Dashed
     red intel-dark panel. Nothing is inferred.
   - VALIDATED: dossier grid (2-up, 1-up below 820px) + gap table + wins
     table.
   Dossier cards: COMP-NN eyebrow, market chip (spokane-wa | phoenix-az |
   national), Black Ops One name, threat badge on the frozen severity ramp
   with a text label, crawl LED (ok | blocked | error), expandable evidence
   groups (services, pricing, guarantees, booking paths, trust signals)
   where every claim pins a source_url link, and an on-page signals block
   (seo_title, h1, meta_description, crawl_error). Gap rows amber-tinted
   (sev-medium), win rows olive-300 tinted, both traceable to a crawl
   source. Plate id: #intel, nav label: INTEL.

## Plate 05 additions (2026-08-01, second pass)

- Empty evidence groups render as "NOT OBSERVED IN CRAWL": absence is
  reported as absence per Nash's gate rule 5, never skipped silently.
- Blocked/error dossiers carry a VERIFY MANUALLY marker (amber) next to the
  crawl LED, so a failed crawl never reads as "competitor has nothing."
- Evidence items filed via manual fallback carry evidence_method=manual and
  render with a MANUAL tag (olive) beside the source link.
- Meta readout now shows per-track counters when present: TRACKS: WA n / AZ n.
- Verified at full scale: 40-competitor contract-faithful fixture (20 WA,
  19 AZ, 1 national; ok/blocked/error mix; manual fallback; empty groups)
  renders 40 dossiers, all four threat severities, both tables. 32/32 DOM
  smoke assertions pass. Synthetic fixture is test-only, never shipped.


