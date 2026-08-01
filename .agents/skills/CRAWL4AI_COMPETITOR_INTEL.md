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

0. PARKED-DOMAIN / NON-COMPETITOR DETECTION (before burning any crawl
   budget): a domain that is for sale, parked, an ad server, or a
   wrong-market operator is NOT a competitor, and its dossier must never read
   as "competitor has nothing." Signals (all confirmed 2026-08-01):
   - llms.txt states the domain is listed for sale (scorpioncontrol.com:
     "currently listed for sale on GoDaddy's aftermarket").
   - Parking lander markers: LANDER_SYSTEM=PW, ap:parking, minimal_text shells
     (709 bytes, 0 chars visible), script-heavy shell with no content,
     window.location redirect to /lander (insectek.com).
   - Domain-for-sale page title: "is for sale | HugeDomains" (spokanepestcontrol.com
     at $4,895; also cropro.com, nwpest.com, phoenixpestcontrol.com,
     scottsdalepestcontrol.com).
   - Ad-server login instead of a company site: ppcinc.com title = "MAZMO Ad
     Server" (Revive Adserver v5.2.0). HTTP 200 with zero pest content.
   - WRONG-MARKET OPERATOR that transport probes mark "ok": guardianpest.com
     serves Utah (SLC/Orem/Provo/Ogden), not the WA track. Always verify the
     live page TITLE and service-area content, not just HTTP status. A 200 OK
     from the wrong state is still a failed entry.
   - Akamai/anti-bot block on a domain whose own site cannot be read (verify
     with a browser-UA curl first: if browser UA returns real content, it is a
     bot wall, not a parked domain; mark manual fallback instead).
   - Verify the real company domain: altapest.com was parked, the real operator
     is altapestcontrol.com (and it did not serve the target market).
   Purge non-competitors from the list BEFORE crawling. Replace with fresh
   probes (live title checks), never from memory. Content-layer verification
   catches what transport probes miss: run the crawl, then audit every
   crawl-ok dossier's title and content for parked/ad-server/wrong-market
   signals before shipping.
1. Confirm the container is healthy: `docker ps --filter name=crawl4ai`
   (restart policy: unless-stopped). If missing, deploy per the setup commands
   in CREDENTIALS.md.
2. Pre-flight every domain with DNS + HTTP(S) probe and record the per-domain
   HTTP status BEFORE crawling. A status of 403 / NXDOMAIN / connection refused
   must surface as "blocked, verify manually" in the dossier, NEVER as an empty
   dossier. An empty dossier must never read as "competitor has nothing."
   Known blocked/broken domains (re-verify each audit): terminix.com,
   westernexterminator.com (curl UA-sensitive 403; browser UA returns 200),
   bugmanpestcontrol.com, postfallspest.com, aptive.com (connection refused),
   ppcinc.com (HTTP only, no HTTPS, crawl over http and note the TLS gap),
   mantispest.com, foxpest.com (Akamai bot walls on real operators, manual
   fallback via GBP).
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

# Ship-to-live (proven path, 2026-08-01)

1. Merge the plate render branch (PR: src/js/app.js, src/index.html,
   src/css/main.css, docs/DESIGN_SPEC.md) and the validated-data branch
   (data/competitors.json, docs/DATA_SCHEMA.md, docs/COMPETITOR_VALIDATION.md,
   tools/validate_competitors.py, .agents/skills/) into master with --no-ff.
   Do it in a separate worktree so in-progress local files are never touched.
2. Re-run tools/validate_competitors.py against the MERGED data/competitors.json
   and confirm verdict=validated before pushing.
3. Push master; the Dokploy app auto-deploys on push (audit app
   sxypKauqk2hdPJEU5U3YL, repo David2024patton/pp-audit-report, branch master).
4. Verify LIVE, not on faith: GET /data/competitors.json returns 200 with
   meta.validation_status=validated and the expected competitor count, and the
   plate HTML/JS markers are present in the served page.

# Notes

- API token must be set at container creation time, otherwise the entrypoint
  binds loopback only and the port is unreachable from the host.
- The crawler container auto-restarts; no manual restart needed after reboot.
- Deployed: unclecode/crawl4ai:latest (v0.9.2), port 11235, container name
  "crawl4ai", Docker v29.6.1.
