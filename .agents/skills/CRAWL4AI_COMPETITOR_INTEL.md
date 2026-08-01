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

- List of competitor domains (top 10+ by local market share / search presence)
- CRAWL4AI_API_TOKEN (in CREDENTIALS.md)
- Crawl4AI endpoint: http://127.0.0.1:11235

# Procedure

1. Confirm the container is healthy: `docker ps --filter name=crawl4ai`
   (restart policy: unless-stopped). If missing, deploy per the setup commands
   in CREDENTIALS.md.
2. POST to the /crawl endpoint:

```bash
curl -s -X POST http://127.0.0.1:11235/crawl \
  -H "Authorization: Bearer $CRAWL4AI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://competitor1.com", "https://competitor2.com", ...]}'
```

3. Extract for each competitor: services offered, pricing/offers, guarantees,
   contact/booking paths, trust signals (reviews, licenses, BBB), on-page SEO
   (titles, keywords), and anything Patriot does not currently offer.
4. Diff against Patriot's current offerings (patriotpest.pro + app data).
5. Write the gap analysis into the audit report data (competitors.json) so the
   render layer (audit.patriotpest.pro) can display it.

# Expected Output

- A per-competitor dossier: strengths, weaknesses, digital presence, threat level
- A gap table: what competitors have that Patriot lacks (or does worse)
- A "doing it better" confirmation: where Patriot wins
- All findings written to data/competitors.json per the locked Nash schema,
  with traceable sources (no fabricated intel)

# Notes

- API token must be set at container creation time, otherwise the entrypoint
  binds loopback only and the port is unreachable from the host.
- The crawler container auto-restarts; no manual restart needed after reboot.
- Deployed: unclecode/crawl4ai:latest (v0.9.2), port 11235, container name
  "crawl4ai", Docker v29.6.1.

# Lessons from 2026-08-01 execution (PR #4, 40-domain crawl)

1. Transport checks LIE. HTTP 200 is not a live competitor. Content crawl is the
   only authority. Real findings from pass 1: insectek.com = GoDaddy parked
   page ("is parked free, courtesy of GoDaddy.com"), ppcinc.com = MAZMO ad-server
   login (redirect to adserver.mazmo.net), spokanepestcontrol.com = HugeDomains
   for-sale page ($4,895). All three passed DNS + HTTP 200 probes. ALWAYS check
   the raw markdown body for park/ad-server/for-sale markers before filing a
   competitor as crawl-ok.
2. Akamai bot walls are definitive, not retryable. HTTP 403 on every path with
   "Blocked by anti-bot protection" in container logs = stop. Mark
   crawl_status=blocked, crawl_error with the 403 evidence, evidence_method=manual.
   Retries waste crawl budget and produce nothing.
3. Claim discipline: every evidence claim string must be verified verbatim in the
   raw markdown (case-insensitive substring check). Build the dossier with a
   sentence-extraction harness that drops unverified claims, never infers.
4. Write the builder as a Python file on disk, not a bash heredoc. Heredocs over
   ~8KB truncate silently (hit twice). Split evidence data into a JSON file and
   append in chunks; verify JSON parses before running.
5. Report honest per-track math. A gate that fails (75% < 80% floor) with clean
   rules 1/2/3/5/6 is correct output when parked domains are still on the list;
   purge/replace is the list owner's call, not a rounding exercise.
6. Manual fallback entries need a live http(s) source_url (domain root or GBP
   link) and evidence_method=manual; blocked entries without crawl_error fail
   rule 4.
