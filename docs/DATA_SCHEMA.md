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
