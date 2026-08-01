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
