---
title: "Crawl4AI Competitor Intel Crawl"
tags: [crawl4ai, competitors, audit, gap-analysis, docker]
status: active
created: 2026-08-01
---

# Purpose

Before shipping ANY audit report, crawl the top 10+ competitor websites to
verify we are not missing a service, feature, offer, or positioning angle, and
to confirm Patriot's own site does it better. This is a standing order from the
owner (David, 2026-08-01) and is a permanent part of the audit SOP.

# Inputs

- List of competitor domains (top 10+ per service market, see Market Tracks)
- CRAWL4AI_API_TOKEN (in CREDENTIALS.md)
- Crawl4AI endpoint: http://127.0.0.1:11235

# Market Tracks (multi-market mandatory)

The crawl list MUST be split by service market. A single-market crawl is a
failed gate. Current tracks for Patriot (locked 2026-08-01):

- **WA track** (Spokane + Coeur d'Alene + Hermiston): 10+ domains. Must include
  Sprague Pest Solutions (spraguepest.com).
- **AZ track** (Phoenix/Maricopa): 10+ domains, minimum. Must include
  patriotpestaz.com (brand-conflict competitor) on EVERY audit. Verified AZ
  domains: greenhomepest.com, azpestcontrol.com, burnspestelimination.com,
  blueskypest.com, varsitypest.com, urbandesertpest.com, insectek.com,
  nwexterminating.com, trulynolen.com, patriotpestaz.com.

Phoenix track absence = gate FAIL. A gap analysis for a third of the business
is not a gap analysis.

# Procedure

1. Confirm the container is healthy: `docker ps --filter name=crawl4ai`
   (restart policy: unless-stopped). If missing, deploy per the setup commands
   in CREDENTIALS.md.
2. Pre-flight every domain with DNS + HTTP(S) probe and record the per-domain
   HTTP status BEFORE crawling. A status of 403 / NXDOMAIN / connection refused
   must surface as "blocked, verify manually" in the dossier, NEVER as an empty
   dossier. An empty dossier must never read as "competitor has nothing."
   Known blocked/broken domains (re-verify each audit): terminix.com,
   westernexterminator.com (403 bot-block), bugmanpestcontrol.com,
   postfallspest.com, aptive.com (connection refused), ppcinc.com (HTTP only,
   no HTTPS, crawl over http and note the TLS gap).
3. POST to the /crawl endpoint:

```bash
curl -s -X POST http://127.0.0.1:11235/crawl \
  -H "Authorization: Bearer $CRAWL4AI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://competitor1.com", "https://competitor2.com", ...]}'
```

4. Extract for each competitor: services offered, pricing/offers, guarantees,
   contact/booking paths, trust signals (reviews, licenses, BBB), on-page SEO
   (titles, keywords), and anything Patriot does not currently offer.
5. Diff against Patriot's current offerings (patriotpest.pro + app data).
6. Write the gap analysis into data/competitors.json per the LOCKED contract in
   docs/DATA_SCHEMA.md (PR #2). Every claim carries a source_url that resolves
   to the competitor it is filed under. Absent from crawl output = absent from
   the file. No fabricated intel, ever.

# Expected Output

- Per-competitor dossier with crawl_status recorded: ok | blocked | error.
  A blocked/error status carries crawl_error (e.g. "HTTP 403 bot-blocked",
  "NXDOMAIN", "connection refused") plus a "verify manually" marker, NEVER an
  empty dossier.
- evidence items (services, pricing, guarantees, booking_paths, trust_signals)
  with source_url on every single one. Manual fallback (GBP/landing page
  research) is allowed on blocked domains but MUST be marked
  evidence_method="manual" with a live source_url.
- gaps[] (what competitors have that Patriot lacks) and wins[] (where Patriot
  does it better), both source-traceable
- digital_presence: seo_title, meta_description, h1, crawl_status, crawled_at
- market tags per competitor: spokane-wa | phoenix-az | national
- PER-TRACK GATE: wa_count >= 10 AND az_count >= 10 (domain_count >= 20).
  A single-market list fails on arrival. Phoenix track absence is a hard fail.
  Crawl success floor: crawl_status ok for >= 80 percent of competitors total.
- All findings written to data/competitors.json per the locked Nash contract
  (docs/DATA_SCHEMA.md, PR #2), validated by Nash against
  docs/COMPETITOR_VALIDATION.md before Rockwell renders.

# Notes

- API token must be set at container creation time, otherwise the entrypoint
  binds loopback only and the port is unreachable from the host.
- The crawler container auto-restarts; no manual restart needed after reboot.
- Deployed: unclecode/crawl4ai:latest (v0.9.2), port 11235, container name
  "crawl4ai", Docker v29.6.1.
