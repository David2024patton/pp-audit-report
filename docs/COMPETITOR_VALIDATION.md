---
title: "Competitor Intel Validation Gate"
tags: [validation, competitors, crawl4ai, data-integrity, audit-sop]
status: active
created: 2026-08-01
owner: Nash
consumer: Hamilton, Rockwell, Washington
---

# COMPETITOR INTEL VALIDATION GATE // NASH

Standing order (owner David, 2026-08-01): no audit report ships without a
top-10+ competitor website crawl and a validated gap analysis. This gate
validates data/competitors.json produced by the Hamilton crawl before
Rockwell renders the competitor intel plate. It blocks on evidence, never
on personality.

## Hard pass/fail rules

1. Claim coverage: every evidence item under services, pricing, guarantees,
   booking_paths, and trust_signals must carry a source_url. Zero exceptions.
   Pass requires 100 percent claim coverage.
2. Source-domain match: every source_url must resolve to the competitor
   domain it is filed under. A source_url that points at a different
   competitor or at patriotpest.pro fails that competitor's dossier.
3. Domain count: domain_count must be 10 or greater. Fewer than 10 crawled
   competitors fails the gate.
4. Crawl success rate: crawl_status must be ok for at least 80 percent of
   competitors. blocked/error competitors are listed as unresolved and are
   never inferred, guessed, or filled from memory.
5. No fabricated intel: a service, price, guarantee, or trust signal that is
   not in the crawl output is not in competitors.json. Absence is reported
   as absence.
6. Threat-level consistency: critical means the competitor directly matches
   Patriot's core service areas with stronger trust signals or lower booking
   friction per the crawl evidence. Low means no service or market overlap.
   Assignments must be reproducible from the evidence array.

## Output

- Pass: meta.validation_status = validated, meta.validator = Nash. The plate
  unlocks for Rockwell's render layer.
- Fail: meta.validation_status = failed plus a findings list (id, competitor,
  rule violated, evidence gap). Hamilton re-crawls the failing domains and
  the file returns to pending until the gate re-runs.

## Checklist

- [ ] Every evidence item has a source_url (100 percent coverage)
- [ ] Source URLs match the competitor domain they are filed under
- [ ] domain_count >= 10
- [ ] crawl_status ok ratio >= 80 percent
- [ ] blocked/error competitors listed as unresolved, never inferred
- [ ] No claim without crawl backing
- [ ] Threat levels reproducible from evidence
- [ ] validation_status set and generated timestamp fresh

Nash
