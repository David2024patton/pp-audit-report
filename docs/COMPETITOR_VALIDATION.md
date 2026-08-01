---
title: "Competitor Intel Validation Gate"
tags: [validation, competitors, crawl4ai, data-integrity, audit-sop]
status: active
created: 2026-08-01
updated: 2026-08-01
owner: Nash
consumer: Hamilton, Rockwell, Washington, Lewis
---

# COMPETITOR INTEL VALIDATION GATE // NASH

Standing order (owner David, 2026-08-01): no audit report ships without a
top-10+ competitor website crawl and a validated gap analysis. This gate
validates data/competitors.json produced by the Hamilton crawl before
Rockwell renders the competitor intel plate. It blocks on evidence, never
on personality. Crawl procedure lives in the CRAWL4AI_COMPETITOR_INTEL
skill (PR #1); this document is the validation authority (PR #2).

Updated 2026-08-01: per-track enforcement added so a single-market list
(Spokane-only) can never pass while Phoenix goes unevaluated. Hunter's
sanity doctrine (RESEARCH/PP_APP_AUDIT/HUNTER_COMPETITOR_SANITY.md),
adopted in full by Washington, is load-bearing in the gate.

## Hard pass/fail rules

1. Claim coverage: every evidence item under services, pricing, guarantees,
   booking_paths, and trust_signals must carry a source_url. Zero exceptions.
   Pass requires 100 percent claim coverage.
2. Source-domain match: every crawl-sourced source_url must resolve to the
   competitor domain it is filed under. Manual-fallback items carry
   evidence_method="manual" and a live source_url from the competitor's
   verified properties (own domain or official Google Business Profile).
3. Track coverage: wa_count >= 10 AND az_count >= 10, so domain_count >= 20.
   A file with fewer than 10 competitors in either track fails even if the
   total is 10 or more. Phoenix track absence is a hard fail.
4. Crawl success rate: crawl_status must be ok for at least 80 percent of
   competitors. Every blocked/error competitor must carry crawl_error (e.g.
   "HTTP 403 bot-blocked", "NXDOMAIN", "connection refused") and is listed
   as unresolved with a "verify manually" marker. A blocked/error dossier
   must never read as "competitor has nothing": its evidence arrays stay
   empty unless manual fallback is performed and marked.
5. No fabricated intel: a service, price, guarantee, or trust signal that is
   not in the crawl output (or a marked manual fallback) is not in
   competitors.json. Absence is reported as absence.
6. Threat-level consistency: critical means the competitor directly matches
   Patriot's core service areas with stronger trust signals or lower booking
   friction per the evidence. Low means no service or market overlap.
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
- [ ] Manual-fallback items marked evidence_method="manual" with live source
- [ ] wa_count >= 10 and az_count >= 10 (domain_count >= 20)
- [ ] crawl_status ok ratio >= 80 percent
- [ ] blocked/error competitors carry crawl_error + verify-manually marker
- [ ] No claim without crawl backing (or marked manual fallback)
- [ ] Threat levels reproducible from evidence
- [ ] validation_status set and generated timestamp fresh

Nash
