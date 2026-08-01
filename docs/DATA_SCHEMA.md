---
title: "Audit Site Data Schema"
tags: [schema, json, audit-site, data-contract]
status: active
created: 2026-07-31
owner: Nash
consumer: Rockwell
---

# DATA SCHEMA // audit.patriotpest.pro

Three JSON files in /data. All are fetch-and-render ready. No build step.

## scores.json

Domain scores for the six animated dials.

```json
{
  "meta": {
    "generated": "ISO-8601",
    "project": "patriot-pest-app",
    "audit_date": "2026-07-31",
    "verdict": "The machine is built. It is not turned on.",
    "convergent_conclusion": "string"
  },
  "domains": [{
    "id": "architecture",
    "name": "Architecture",
    "owner": "Edison",
    "score": 6.1,
    "max": 10,
    "verdict": "string",
    "subscores": [{"name": "string", "score": 7.0}]
  }],
  "overall_average": 5.1,
  "do_not_regress": ["string"]
}
```

Security domain has score=null and a severity_counts object instead:
```json
{
  "id": "security",
  "score": null,
  "score_display": "1 critical, 4 high",
  "severity_counts": {"critical": 1, "high": 4, "medium": 5, "low": 4}
}
```

## gates.json

Six-gate launch pipeline with per-item checklists.

```json
{
  "meta": {
    "generated": "ISO-8601",
    "hard_rule": "string",
    "go_now": ["string"]
  },
  "gates": [{
    "id": 0,
    "name": "Production Foundation",
    "owner": "Edison",
    "status": "pending",
    "description": "string",
    "items": [{"text": "string", "done": false}]
  }]
}
```

Gate status values: pending | in_progress | complete.
Item done values: true | false.

## findings.json

73 findings. Deduplicated across all six audits. Cross-referenced.

```json
{
  "meta": {
    "generated": "ISO-8601",
    "project": "patriot-pest-app",
    "audit_date": "2026-07-31",
    "total": 73,
    "redaction_policy": "string",
    "severity_order": ["critical","high","medium","low"],
    "domains": ["architecture","frontend","security","data","content","gtm"]
  },
  "findings": [{
    "id": "SEC-C1",
    "domain": "security",
    "severity": "critical",
    "owner": "Turing",
    "gate": 4,
    "category": "Compliance",
    "status": "open",
    "title": "string",
    "summary": "public-safe summary",
    "impact": "public-safe impact statement",
    "redacted": true,
    "resolution_note": null,
    "cross_refs": ["DATA-4","GTM-1"]
  }]
}
```

### Field notes

- id: stable code, PREFIX-N or PREFIX-ABBREV. Never changes.
- domain: architecture | frontend | security | data | content | gtm
- severity: critical | high | medium | low
- owner: Edison | Turing | Rockwell | Nash | Hunter | Hamilton
- gate: 0-5 or null (null = not gate-bound)
- status: open | fixed | redacted
- redacted: true means technical detail is withheld on the public site.
  Render summary + impact only. Paint the detail as a redacted bar.
- resolution_note: optional string for pending rulings (e.g. David decisions)
- cross_refs: array of finding IDs this finding relates to

### Counts

- 7 critical, 22 high, 26 medium, 18 low
- 10 redacted (all security-domain exploitable specifics)
- By owner: Edison 20, Nash 15, Turing 14, Rockwell 12, Hunter 10, Hamilton 2

### Update protocol

When a finding is fixed: set status to "fixed", set redacted to false,
optionally add a resolution_note. The card unseals on next fetch. No rebuild.

Nash


## competitors.json

Competitor intel plate. Crawl-backed only: every claim traces to a crawl4ai
output URL. Produced by Hamilton (crawl), validated by Nash (evidence gate),
rendered by Rockwell (plate). Added 2026-08-01 per owner standing order
(no audit report ships without a top-10+ competitor crawl).

```json
{
  "meta": {
    "generated": "ISO-8601",
    "project": "patriot-pest-control",
    "audit_date": "2026-08-01",
    "crawl_engine": "crawl4ai",
    "crawl_version": "0.9.2",
    "crawled_at": "ISO-8601",
    "domain_count": 20,
    "wa_count": 10,
    "az_count": 10,
    "validation_status": "pending | validated | failed",
    "validator": "Nash"
  },
  "competitors": [{
    "id": "COMP-01",
    "name": "string",
    "domain": "string",
    "market": "spokane-wa | phoenix-az | national",
    "threat_level": "critical | high | medium | low",
    "evidence": {
      "services":      [{"text": "string", "source_url": "string", "evidence_method": "crawl | manual"}],
      "pricing":       [{"text": "string", "source_url": "string"}],
      "guarantees":    [{"text": "string", "source_url": "string"}],
      "booking_paths": [{"text": "string", "source_url": "string"}],
      "trust_signals": [{"text": "string", "source_url": "string"}]
    },
    "digital_presence": {
      "seo_title": "string",
      "meta_description": "string",
      "h1": "string",
      "crawl_status": "ok | blocked | error",
      "crawl_error": null,
      "crawled_at": "ISO-8601"
    }
  }],
  "gaps": [{
    "id": "GAP-01",
    "category": "service | offer | feature | positioning | trust",
    "description": "string",
    "competitor_ids": ["COMP-01"],
    "patriot_impact": "string",
    "source_url": "string"
  }],
  "wins": [{
    "id": "WIN-01",
    "category": "service | offer | feature | positioning | trust",
    "description": "string",
    "patriot_evidence": "string",
    "source_url": "string"
  }]
}
```

### Field notes

- id: stable code, PREFIX-N. Never changes.
- threat_level: reuses the frozen severity ramp (critical | high | medium |
  low) so the plate renders on the existing severity ramp.
- evidence: every item carries source_url from the crawl4ai output. No
  source_url, no claim. evidence_method is optional and defaults to "crawl";
  manual fallback (blocked domains, GBP/landing page research) must be marked
  "manual".
- wa_count and az_count: per-track counts. Enforced by validation gate rule 3
  (10 minimum per track). A single-market list cannot pass.
- Per-track crawl-ok floor: gate rule 4 requires >= 80 percent crawl-ok
  overall AND within each track (wa_ok/wa_count, az_ok/az_count).
- blocked/error dossiers: crawl_error is required and the dossier is marked
  unresolved, never inferred.
- digital_presence.crawl_status: ok | blocked | error. blocked/error means the
  competitor site rejected the crawl; the competitor stays listed as
  unresolved and is never inferred.
- gaps: what competitors have that Patriot lacks. wins: where Patriot
  demonstrably does it better. Both are traceable to a crawl source.
- validation_status: set to validated only after Nash's evidence gate passes
  (100 percent claim coverage, no fabricated intel, threat levels assigned).

### Update protocol

- Hamilton writes crawl output into this file. Nash validates. Rockwell renders.
- A validated file is immutable for that audit date; a re-crawl produces a new
  generated timestamp and a fresh validation pass.

Nash
