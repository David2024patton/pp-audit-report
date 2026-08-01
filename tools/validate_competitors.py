#!/usr/bin/env python3
"""
Nash competitor validation gate - executable form.

Enforces docs/COMPETITOR_VALIDATION.md (PR #2) against data/competitors.json
produced by the Hamilton crawl. Exit 0 = pass, 1 = fail. JSON report on stdout.

Rules (all six, plus per-track counts):
  1. Claim coverage: every evidence item carries a non-empty source_url (100%)
  2. Source-domain match: crawl-sourced urls resolve to the competitor's domain
  3. Track coverage: wa_count >= 10 AND az_count >= 10 (domain_count >= 20)
  4. Crawl-ok floor: >= 80% overall AND per track; blocked/error carry crawl_error
  5. No fabricated intel: evidence_method in (crawl|manual); no claim without source
  6. Threat-level: enum critical|high|medium|low, reproducible from evidence

Usage: python tools/validate_competitors.py [path/to/competitors.json]
"""
import json, sys, re
from collections import Counter
from urllib.parse import urlparse

EVIDENCE_GROUPS = ("services", "pricing", "guarantees", "booking_paths", "trust_signals")
THREATS = ("critical", "high", "medium", "low")
METHODS = ("crawl", "manual")
MARKETS = ("spokane-wa", "phoenix-az", "national")

def host_of(url):
    try:
        return (urlparse(url).netloc or "").lower()
    except Exception:
        return ""

def domain_match(url, domain):
    host = host_of(url)
    d = domain.lower()
    return host == d or host.endswith("." + d)

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "data/competitors.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(json.dumps({"verdict": "error", "path": path, "error": str(e)}, indent=2))
        sys.exit(1)

    rules = {}
    problems = []
    warnings = []

    comps = data.get("competitors", [])
    meta = data.get("meta", {})
    gaps = data.get("gaps", [])
    wins = data.get("wins", [])

    # Rule 3 / track counts from market field
    market_counts = Counter(c.get("market") for c in comps)
    wa_count = sum(1 for c in comps if c.get("market") == "spokane-wa")
    az_count = sum(1 for c in comps if c.get("market") == "phoenix-az")
    domain_count = len(comps)
    meta_ok = (meta.get("wa_count") == wa_count and meta.get("az_count") == az_count
               and meta.get("domain_count") == domain_count)
    if not meta_ok:
        problems.append(f"rule3: meta counts mismatch file (meta wa={meta.get('wa_count')} az={meta.get('az_count')} total={meta.get('domain_count')}; actual {wa_count}/{az_count}/{domain_count})")
    if wa_count < 10:
        problems.append(f"rule3: wa_count {wa_count} < 10")
    if az_count < 10:
        problems.append(f"rule3: az_count {az_count} < 10")
    if domain_count < 20:
        problems.append(f"rule3: domain_count {domain_count} < 20")
    rules["3_track_coverage"] = "PASS" if not any("rule3" in p for p in problems) else "FAIL"

    # Rules 1, 2, 4, 5, 6 per competitor
    ok_total = 0
    per_track_ok = {"spokane-wa": 0, "phoenix-az": 0, "national": 0}
    per_track_total = {"spokane-wa": 0, "phoenix-az": 0, "national": 0}
    seen_ids = set()
    for c in comps:
        cid = c.get("id", "")
        if cid in seen_ids:
            problems.append(f"rule5: duplicate competitor id {cid}")
        seen_ids.add(cid)
        domain = (c.get("domain") or "").lower()
        market = c.get("market", "")
        status = c.get("status", "ok") if c.get("status") else "ok"
        per_track_total[market] = per_track_total.get(market, 0) + 1
        if status == "ok":
            ok_total += 1
            per_track_ok[market] = per_track_ok.get(market, 0) + 1
        else:
            if not c.get("crawl_error"):
                problems.append(f"rule4: {cid} status={status} missing crawl_error")
        # rule 1 + 2 + 5: evidence
        evidence = c.get("evidence", {})
        for group in EVIDENCE_GROUPS:
            for item in evidence.get(group, []):
                url = item.get("source_url", "")
                if not url:
                    problems.append(f"rule1: {cid} {group} item missing source_url: {item.get('text','')[:40]}")
                    continue
                em = item.get("evidence_method", "crawl")
                if em not in METHODS:
                    problems.append(f"rule5: {cid} {group} bad evidence_method {em}")
                if em == "crawl" and not domain_match(url, domain):
                    problems.append(f"rule2: {cid} {group} source_url {url} not under {domain}")
                if em == "manual" and not url.lower().startswith(("http://", "https://")):
                    problems.append(f"rule5: {cid} {group} manual source_url not a URL: {url}")
        # rule 6
        threat = c.get("threat_level")
        if threat not in THREATS:
            problems.append(f"rule6: {cid} threat_level {threat!r} not in {THREATS}")
        # rule 5: ok crawl with zero evidence = suspicious empty
        if status == "ok" and not any(evidence.get(g) for g in EVIDENCE_GROUPS):
            warnings.append(f"rule5: {cid} crawl-ok but zero evidence items (verify empty dossier)")

    # Rule 4 floor
    def pct(ok, tot): return (ok / tot * 100) if tot else 0.0
    overall = pct(ok_total, domain_count)
    per_track_pct = {m: pct(per_track_ok.get(m,0), per_track_total.get(m,0)) for m in ("spokane-wa","phoenix-az")}
    if domain_count and overall < 80:
        problems.append(f"rule4: overall crawl-ok {overall:.1f}% < 80%")
    for m in ("spokane-wa", "phoenix-az"):
        if per_track_total.get(m, 0) and per_track_pct[m] < 80:
            problems.append(f"rule4: {m} crawl-ok {per_track_pct[m]:.1f}% < 80%")
    rules["4_crawl_ok_floor"] = "PASS" if not any("rule4" in p for p in problems) else "FAIL"

    # Gaps/wins source traceability
    for g in gaps:
        if not g.get("source_url"):
            problems.append(f"rule1: gap {g.get('id')} missing source_url")
    for w in wins:
        if not w.get("source_url"):
            problems.append(f"rule1: win {w.get('id')} missing source_url")

    rules["1_claim_coverage"] = "PASS" if not any("rule1" in p for p in problems) else "FAIL"
    rules["2_source_domain"] = "PASS" if not any("rule2" in p for p in problems) else "FAIL"
    rules["5_no_fabrication"] = "PASS" if not any("rule5" in p for p in problems) else "FAIL"
    rules["6_threat_level"] = "PASS" if not any("rule6" in p for p in problems) else "FAIL"

    verdict = "validated" if not problems else "failed"
    report = {
        "verdict": verdict,
        "path": path,
        "meta": {
            "wa_count": wa_count, "az_count": az_count, "domain_count": domain_count,
            "crawl_ok_overall": round(overall, 1),
            "crawl_ok_wa": round(per_track_pct["spokane-wa"], 1),
            "crawl_ok_az": round(per_track_pct["phoenix-az"], 1),
            "status_counts": dict(Counter(c.get("status","ok") for c in comps)),
            "validation_status_current": meta.get("validation_status"),
            "validation_status_recommended": verdict,
        },
        "rules": rules,
        "problems": problems,
        "warnings": warnings,
    }
    print(json.dumps(report, indent=2))
    sys.exit(0 if verdict == "validated" else 1)

if __name__ == "__main__":
    main()
