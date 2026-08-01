/* ============================================================
   AUDIT.SYS // render engine
   Static shell + fetch-and-render over /data JSON. No framework.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DATA = { scores: null, gates: null, findings: null, competitors: null };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function countUp(el, target, decimals, suffix) {
    decimals = decimals || 0;
    suffix = suffix || '';
    if (REDUCED) { el.textContent = target.toFixed(decimals) + suffix; return; }
    var dur = 1400, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3); /* ease-out cubic */
      el.textContent = (target * e).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fetchJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' -> HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---------- ambient: clock, progress, reveals, nav ---------- */
  function startClock() {
    var el = $('#utc-clock');
    if (!el) return;
    function tick() {
      var d = new Date();
      function p(n) { return String(n).padStart(2, '0'); }
      el.textContent = p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + 'Z';
    }
    tick();
    setInterval(tick, 1000);
  }

  function startProgress() {
    var bar = $('#progress');
    if (!bar) return;
    var raf = null;
    function paint() {
      raf = null;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    paint();
  }

  function startReveals() {
    var els = $all('.rv');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function startNavSpy() {
    var links = $all('.topnav a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (a) { a.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $all('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------- 01 scorecard dials ---------- */
  var DOMAIN_SEV = {
    architecture: 'var(--orange)',
    frontend: 'var(--orange-hot)',
    security: 'var(--sev-critical)',
    data: 'var(--sev-medium)',
    content: 'var(--sev-low)',
    gtm: 'var(--khaki)'
  };
  var SEV_COLOR = { critical: 'var(--sev-critical)', high: 'var(--sev-high)', medium: 'var(--sev-medium)', low: 'var(--sev-low)' };
  var RING_C = 2 * Math.PI * 44; /* r=44 in a 100 viewBox */

  function dialSVG(domain) {
    var sev = DOMAIN_SEV[domain.id] || 'var(--orange)';
    return '<svg viewBox="0 0 100 100" role="img" aria-hidden="true">' +
      '<circle class="ring-tick" cx="50" cy="50" r="49"></circle>' +
      '<circle class="ring-track" cx="50" cy="50" r="44"></circle>' +
      '<circle class="ring-val" cx="50" cy="50" r="44" data-target="' + (domain.score != null ? domain.score / domain.max : 0) + '"></circle>' +
      '</svg>';
  }

  function renderDials(scores) {
    var host = $('#dials');
    if (!host || !scores) return;
    var html = scores.domains.map(function (d, i) {
      var sev = DOMAIN_SEV[d.id] || 'var(--orange)';
      var numHtml;
      if (d.score != null) {
        numHtml = '<span class="dial-num"><span class="dial-score" data-score="' + d.score + '">0.0</span><span class="dial-max">/' + d.max + '</span></span>';
      } else {
        numHtml = '<span class="dial-num dial-num-qual" title="' + esc(d.score_display || '') + '">—</span>';
      }
      var subHtml = '';
      if (d.subscores && d.subscores.length) {
        subHtml = '<ul class="dial-subs">' + d.subscores.map(function (s) {
          var w = Math.max(0, Math.min(1, s.score / 10));
          var c = s.score >= 7 ? 'var(--ok)' : (s.score >= 5 ? 'var(--sev-medium)' : 'var(--sev-critical)');
          return '<li><span>' + esc(s.name) + '</span><span class="sub-bar"><i style="--w:' + w + ';background:' + c + '"></i></span><span class="sub-val">' + s.score.toFixed(1) + '</span></li>';
        }).join('') + '</ul>';
      } else if (d.severity_counts) {
        var sc = d.severity_counts;
        subHtml = '<div class="sev-seg" role="img" aria-label="Severity distribution: ' +
          sc.critical + ' critical, ' + sc.high + ' high, ' + sc.medium + ' medium, ' + sc.low + ' low">' +
          '<span style="background:var(--sev-critical)">' + sc.critical + 'C</span>' +
          '<span style="background:var(--sev-high)">' + sc.high + 'H</span>' +
          '<span style="background:var(--sev-medium)">' + sc.medium + 'M</span>' +
          '<span style="background:var(--sev-low)">' + sc.low + 'L</span></div>';
      }
      var qual = d.score_display ? '<p class="dial-qual mono">' + esc(d.score_display) + '</p>' : '';
      return '<article class="dial rv" data-idx="' + String(i + 1).padStart(2, '0') + '" style="--sev:' + sev + '" role="listitem" data-d="' + (i % 3) + '">' +
        '<div class="dial-top">' + dialSVG(d) +
        '<div><div class="dial-read">' + numHtml + qual + '</div>' +
        '<h3 class="dial-name">' + esc(d.name) + '</h3>' +
        '<p class="dial-owner">AUDITOR: ' + esc(d.owner) + '</p></div></div>' +
        '<p class="dial-verdict">' + esc(d.verdict) + '</p>' + subHtml +
        '</article>';
    }).join('');
    host.innerHTML = html;

    var ov = $('#overall-readout');
    if (ov && scores.overall_average != null) {
      ov.innerHTML = 'CONVERGENT READ <span class="eyebrow-sep">//</span> COMPOSITE ACROSS NUMERIC DOMAINS: <b><span id="overall-num">0.0</span>/10</b> <span class="eyebrow-sep">//</span> ' +
        esc(scores.meta.convergent_conclusion || '');
    }
    var cv = $('#colophon-verdict');
    if (cv) cv.innerHTML = 'VERDICT <span class="eyebrow-sep">//</span> <b>' + esc(scores.meta.verdict || '') + '</b>';
  }

  function animateDials() {
    $all('#dials .ring-val').forEach(function (ring) {
      var t = parseFloat(ring.getAttribute('data-target')) || 0;
      var target = RING_C * t;
      if (REDUCED) { ring.style.strokeDasharray = target + ' ' + RING_C; return; }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { ring.style.strokeDasharray = target + ' ' + RING_C; });
      });
    });
    $all('#dials .dial-score').forEach(function (el) {
      countUp(el, parseFloat(el.getAttribute('data-score')), 1, '');
    });
    var ovNum = $('#overall-num');
    if (ovNum && DATA.scores && DATA.scores.overall_average != null) {
      countUp(ovNum, DATA.scores.overall_average, 1, '');
    }
  }

  /* ---------- 02 verdict transmission ---------- */
  function renderVerdict(scores) {
    var list = $('#holds-list');
    if (list && scores && scores.do_not_regress) {
      list.innerHTML = scores.do_not_regress.map(function (item) {
        return '<li>' + esc(item) + '</li>';
      }).join('');
    }
    $all('.tx-num').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      countUp(el, target, 0, '');
    });
  }

  /* ---------- 03 findings explorer ---------- */
  var SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  var FILTERS = { severity: null, owner: null, gate: null, status: null };

  function chip(label, value, key, count, extra) {
    var attrs = 'type="button" class="chip" data-key="' + key + '" data-val="' + esc(value) + '" aria-pressed="false"' + (extra || '');
    return '<button ' + attrs + '>' + esc(label) + (count != null ? '<span class="chip-n">' + count + '</span>' : '') + '</button>';
  }

  function buildFilters(findings) {
    var counts = { severity: {}, owner: {}, gate: {}, status: {} };
    findings.forEach(function (f) {
      ['severity', 'owner', 'status'].forEach(function (k) {
        counts[k][f[k]] = (counts[k][f[k]] || 0) + 1;
      });
      var g = f.gate == null ? 'none' : String(f.gate);
      counts.gate[g] = (counts.gate[g] || 0) + 1;
    });
    var sevHost = $('#filter-severity');
    sevHost.innerHTML = ['critical', 'high', 'medium', 'low'].map(function (s) {
      return chip(s, s, 'severity', counts.severity[s] || 0, ' data-sev="' + s + '"');
    }).join('');
    var owners = ['Edison', 'Turing', 'Rockwell', 'Nash', 'Hunter', 'Hamilton'];
    $('#filter-owner').innerHTML = owners.map(function (o) {
      return chip(o, o, 'owner', counts.owner[o] || 0);
    }).join('');
    var gates = ['0', '1', '2', '3', '4', '5', 'none'];
    $('#filter-gate').innerHTML = gates.map(function (g) {
      return chip(g === 'none' ? 'FREE' : 'G' + g, g, 'gate', counts.gate[g] || 0);
    }).join('');
    $('#filter-status').innerHTML = ['open', 'fixed', 'redacted'].map(function (s) {
      return chip(s, s, 'status', counts.status[s] || 0);
    }).join('');

    $all('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        var key = c.getAttribute('data-key'), val = c.getAttribute('data-val');
        var was = FILTERS[key] === val;
        FILTERS[key] = was ? null : val;
        $all('.chip[data-key="' + key + '"]').forEach(function (x) {
          x.setAttribute('aria-pressed', String(!was && x === c));
        });
        applyFilters();
      });
    });
    $('#filter-clear').addEventListener('click', function () {
      FILTERS.severity = FILTERS.owner = FILTERS.gate = FILTERS.status = null;
      $all('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      applyFilters();
    });
  }

  function matches(f) {
    if (FILTERS.severity && f.severity !== FILTERS.severity) return false;
    if (FILTERS.owner && f.owner !== FILTERS.owner) return false;
    if (FILTERS.status && f.status !== FILTERS.status) return false;
    if (FILTERS.gate) {
      var g = f.gate == null ? 'none' : String(f.gate);
      if (g !== FILTERS.gate) return false;
    }
    return true;
  }

  function applyFilters() {
    var rows = $all('.fx-row');
    var shown = 0;
    rows.forEach(function (row) {
      var f = row._finding;
      var ok = matches(f);
      row.hidden = !ok;
      if (ok) shown++;
    });
    $('#fx-count').textContent = shown + '/' + rows.length;
    $('#fx-empty').hidden = shown !== 0;
  }

  function detailHTML(f, all) {
    var parts = [];
    parts.push('<div class="fx-detail-inner">');
    parts.push('<p><span class="fx-detail-label">// SUMMARY</span>' + esc(f.summary) + '</p>');
    parts.push('<p><span class="fx-detail-label">// IMPACT</span>' + esc(f.impact) + '</p>');
    if (f.redacted) {
      parts.push('<div class="redacted-bar" role="note">Technical detail sealed. Unseals when the fix lands.</div>');
    }
    if (f.resolution_note) {
      parts.push('<div class="ruling-note"><span class="fx-detail-label">// RULING ON FILE</span>' + esc(f.resolution_note) + '</div>');
    }
    if (f.cross_refs && f.cross_refs.length) {
      var tags = f.cross_refs.map(function (id) {
        var target = all.find(function (x) { return x.id === id; });
        var label = target ? id + ' · ' + target.severity : id;
        return '<button type="button" class="xref-tag" data-xref="' + esc(id) + '">' + esc(label) + '</button>';
      }).join('');
      parts.push('<div class="xref"><span class="fx-detail-label" style="margin:0 .4rem 0 0">// RELATED</span>' + tags + '</div>');
    }
    parts.push('</div>');
    return parts.join('');
  }

  function renderFindings(payload) {
    var host = $('#finding-list');
    if (!host || !payload) return;
    var all = payload.findings.slice().sort(function (a, b) {
      var s = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (s !== 0) return s;
      var st = (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1);
      if (st !== 0) return st;
      return a.id < b.id ? -1 : 1;
    });
    host.innerHTML = all.map(function (f) {
      var gateLabel = f.gate == null ? 'FREE' : 'G' + f.gate;
      var statusLabel = f.redacted && f.status === 'open' ? 'redacted' : f.status;
      var caret = '<span class="fx-caret" aria-hidden="true">▸</span>';
      return '<div class="fx-row' + (f.status === 'fixed' ? ' is-fixed' : '') + '" data-sev="' + esc(f.severity) + '" data-id="' + esc(f.id) + '" role="listitem">' +
        '<button type="button" class="fx-btn" aria-expanded="false" aria-controls="d-' + esc(f.id) + '">' +
        '<span class="fx-id">' + esc(f.id) + '</span>' +
        '<span class="fx-sev" data-sev="' + esc(f.severity) + '">' + esc(f.severity) + '</span>' +
        '<span class="fx-title">' + esc(f.title) + '<span class="fx-cat">' + esc(f.category) + '</span>' + caret + '</span>' +
        '<span class="fx-owner">' + esc(f.owner) + '</span>' +
        '<span class="fx-gate">' + gateLabel + '</span>' +
        '<span class="fx-status" data-status="' + esc(statusLabel) + '">' + esc(statusLabel) + '</span>' +
        '</button>' +
        '<div class="fx-detail" id="d-' + esc(f.id) + '">' + detailHTML(f, all) + '</div>' +
        '</div>';
    }).join('');

    /* wire expand/collapse */
    $all('.fx-btn', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('open', !open);
      });
    });
    /* wire cross-ref jumps */
    $all('.xref-tag', host).forEach(function (tag) {
      tag.addEventListener('click', function () {
        var id = tag.getAttribute('data-xref');
        var row = host.querySelector('.fx-row[data-id="' + id + '"]');
        if (!row) return;
        /* clear filters that would hide the target */
        FILTERS.severity = FILTERS.owner = FILTERS.gate = FILTERS.status = null;
        $all('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        applyFilters();
        var btn = row.querySelector('.fx-btn');
        if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
        row.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
        btn.focus();
      });
    });

    /* attach finding objects for filtering */
    $all('.fx-row', host).forEach(function (row) {
      row._finding = all.find(function (f) { return f.id === row.getAttribute('data-id'); });
    });

    buildFilters(all);
    applyFilters();
    var meta = payload.meta || {};
    var note = $('#fx-redacted-note');
    if (note && meta.redaction_policy) note.textContent = 'redaction policy active: ' + meta.redaction_policy.split('.')[0].toLowerCase();
  }

  /* ---------- 04 launch sequence ---------- */
  function renderGates(payload) {
    var host = $('#gate-pipeline');
    if (!host || !payload) return;
    host.innerHTML = payload.gates.map(function (g) {
      var done = g.items.filter(function (it) { return it.done; }).length;
      var total = g.items.length;
      var w = total ? done / total : 0;
      var status = g.status || (done === total && total > 0 ? 'complete' : (done > 0 ? 'in_progress' : 'pending'));
      var stamp = status === 'complete' ? '<span class="stamp stamp-olive gate-stamp">CLOSED</span>'
        : (status === 'in_progress' ? '<span class="stamp stamp-orange gate-stamp">ACTIVE</span>' : '');
      return '<article class="gate rv" data-status="' + esc(status) + '" role="listitem">' + stamp +
        '<p class="gate-id"><span class="gate-led" aria-hidden="true"></span>GATE ' + g.id + '</p>' +
        '<h3 class="gate-name">' + esc(g.name) + '</h3>' +
        '<p class="gate-owner">OWNER: ' + esc(g.owner) + '</p>' +
        '<p class="gate-desc">' + esc(g.description) + '</p>' +
        '<div class="gate-meter" role="img" aria-label="Gate ' + g.id + ' progress: ' + done + ' of ' + total + ' items complete">' +
        '<span class="gate-meter-track"><span class="gate-meter-fill" style="--w:' + w + '"></span></span>' +
        '<span class="gate-meter-num">' + done + '/' + total + '</span></div>' +
        '<ul class="gate-items">' + g.items.map(function (it) {
          return '<li' + (it.done ? ' class="done"' : '') + '>' + esc(it.text) + '</li>';
        }).join('') + '</ul>' +
        '</article>';
    }).join('');

    var rule = $('#hard-rule-text');
    if (rule && payload.meta && payload.meta.hard_rule) rule.textContent = payload.meta.hard_rule;
    var goList = $('#go-now-list');
    if (goList && payload.meta && payload.meta.go_now) {
      goList.innerHTML = payload.meta.go_now.map(function (item) {
        return '<li>' + esc(item) + '</li>';
      }).join('');
    }
  }

  /* ---------- 05 competitor intel ---------- */
  var THREAT_LABEL = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  var MARKET_LABEL = { 'spokane-wa': 'SPOKANE WA', 'phoenix-az': 'PHOENIX AZ', national: 'NATIONAL' };
  var EVIDENCE_GROUPS = [
    ['services', 'SERVICES'],
    ['pricing', 'PRICING'],
    ['guarantees', 'GUARANTEES'],
    ['booking_paths', 'BOOKING PATHS'],
    ['trust_signals', 'TRUST SIGNALS']
  ];

  function hostOf(url) {
    return String(url || '').replace(/^https?:\/\//, '').split('/')[0];
  }

  function srcLink(url) {
    if (!url) return '';
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">SRC:' + esc(hostOf(url)) + '</a>';
  }

  function evidenceList(items) {
    if (!items || !items.length) return '<p class="empty-state" style="padding:.4rem 0">// NOT OBSERVED IN CRAWL</p>';
    return '<ul>' + items.map(function (it) {
      return '<li><span class="ev-text">' + esc(it.text) + '</span>' + (it.evidence_method === 'manual' ? '<span class="ev-method">MANUAL</span>' : '') + srcLink(it.source_url) + '</li>';
    }).join('') + '</ul>';
  }

  function presenceHTML(dp) {
    if (!dp) return '';
    var rows = [];
    if (dp.seo_title) rows.push(['TITLE', dp.seo_title]);
    if (dp.h1) rows.push(['H1', dp.h1]);
    if (dp.meta_description) rows.push(['META', dp.meta_description]);
    if (dp.crawl_error) rows.push(['CRAWL NOTE', dp.crawl_error]);
    if (!rows.length) return '';
    return '<div class="dossier-pres"><h4>// ON-PAGE SIGNALS</h4>' + rows.map(function (r) {
      return '<div class="pres-row"><span class="pres-k">' + r[0] + '</span><span class="pres-v">' + esc(r[1]) + '</span></div>';
    }).join('') + '</div>';
  }

  function dossierHTML(c, i) {
    var id = c.id || ('COMP-' + String(i + 1).padStart(2, '0'));
    var sev = THREAT_LABEL[c.threat_level] ? c.threat_level : 'low';
    var market = MARKET_LABEL[c.market] || esc(c.market || '');
    var crawl = (c.digital_presence && c.digital_presence.crawl_status) || 'ok';
    var ev = EVIDENCE_GROUPS.map(function (g) {
      var items = (c.evidence && c.evidence[g[0]]) || [];
      return '<div><h4>// ' + g[1] + '</h4>' + evidenceList(items) + '</div>';
    }).join('');
    return '<article class="dossier" role="listitem">' +
      '<div class="dossier-top">' +
        '<div><p class="dossier-rank">' + esc(id) + '</p>' +
        '<h3 class="dossier-name">' + esc(c.name) + '</h3>' +
        '<p class="dossier-sub">' + market + ' <span class="eyebrow-sep">//</span> ' + esc(c.domain || '') + '</p></div>' +
        '<div class="dossier-badges"><span class="threat-badge" data-sev="' + sev + '">THREAT: ' + THREAT_LABEL[sev] + '</span>' +
        '<span class="crawl-led" data-crawl="' + crawl + '">CRAWL: ' + crawl + '</span>' + (crawl !== 'ok' ? '<span class="verify-manual">VERIFY MANUALLY</span>' : '') + '</div>' +
      '</div>' +
      '<button type="button" class="dossier-btn" aria-expanded="false" aria-controls="dos-' + esc(id) + '">' +
        '<span class="fx-caret" aria-hidden="true">▸</span><span class="dossier-more">EVIDENCE DOSSIER</span></button>' +
      '<div class="dossier-detail" id="dos-' + esc(id) + '">' +
        '<div class="dossier-detail-inner"><div class="evidence">' + (ev || '<p class="empty-state">// NO CRAWL EVIDENCE ON FILE</p>') + '</div>' +
        presenceHTML(c.digital_presence) + '</div>' +
      '</div>' +
    '</article>';
  }

  function srcCell(url) {
    if (!url) return '<span class="it-src">NO SOURCE</span>';
    return '<a class="it-src" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">SRC:' + esc(hostOf(url)) + '</a>';
  }

  function intelTable(kind, title, rows) {
    var body = rows.map(function (r) {
      var id = '<span class="it-id">' + esc(r.id) + '</span>';
      var cat = '<span class="it-cat">' + esc(r.category || '') + '</span>';
      var metaSmall = '';
      if (kind === 'gaps') {
        var seen = (r.competitor_ids || []).map(esc).join(', ');
        if (seen) metaSmall += '<small>SEEN AT: ' + seen + '</small>';
        if (r.patriot_impact) metaSmall += '<small>PATRIOT IMPACT: ' + esc(r.patriot_impact) + '</small>';
      } else if (r.patriot_evidence) {
        metaSmall = '<small>PATRIOT EVIDENCE: ' + esc(r.patriot_evidence) + '</small>';
      }
      return '<div class="it-row">' + id + cat +
        '<span class="it-desc">' + esc(r.description) + metaSmall + '</span>' +
        srcCell(r.source_url) + '</div>';
    }).join('');
    return '<div class="intel-table" data-kind="' + kind + '"><p class="intel-table-title">' + title + '</p>' + body + '</div>';
  }

  function intelStatus(payload) {
    var host = $('#intel-status');
    if (!host) return;
    var state = 'dark', tag = 'SIGNAL DARK', msg = '';
    if (!payload) {
      msg = 'competitors.json not on the wire. Crawl output has not landed. Nothing on this plate is inferred.';
    } else {
      var m = payload.meta || {};
      if (m.validation_status === 'validated') {
        state = 'validated';
        tag = 'VALIDATED';
        msg = 'Nash evidence gate passed. Every claim on this plate traces to crawl4ai output.';
      } else if (m.validation_status === 'failed') {
        tag = 'VALIDATION FAILED';
        msg = 'Nash returned the file to Hamilton. The plate stays dark until a validated re-crawl lands.';
      } else {
        tag = 'VALIDATION PENDING';
        msg = 'Crawl output filed, Nash gate not passed. The plate stays dark until validated.';
      }
    }
    host.setAttribute('data-state', state);
    host.innerHTML = '<span class="intel-status-led" aria-hidden="true"></span><span class="intel-status-tag">' + tag + '</span><span class="intel-status-msg">' + msg + '</span>';
  }

  function intelMeta(payload) {
    var host = $('#intel-meta');
    if (!host) return;
    var m = payload && payload.meta;
    if (!m) { host.innerHTML = ''; return; }
    var parts = [];
    if (m.crawl_engine) parts.push('ENGINE: <b>' + esc(m.crawl_engine) + '</b>' + (m.crawl_version ? ' v' + esc(m.crawl_version) : ''));
    if (m.domain_count != null) parts.push('DOMAINS: <b>' + m.domain_count + '</b>');
    if (m.wa_count != null && m.az_count != null) parts.push('TRACKS: <b>WA ' + m.wa_count + ' / AZ ' + m.az_count + '</b>');
    if (m.crawled_at) parts.push('CRAWLED: <b>' + esc(m.crawled_at) + '</b>');
    if (m.validator) parts.push('VALIDATOR: <b>' + esc(m.validator) + '</b>');
    if (m.generated) parts.push('GENERATED: <b>' + esc(m.generated) + '</b>');
    host.innerHTML = parts.join(' <span class="eyebrow-sep">//</span> ');
  }

  function refreshColophon() {
    var meta = $('#colophon-meta');
    if (!meta) return;
    var stamps = [];
    if (DATA.findings && DATA.findings.meta && DATA.findings.meta.generated) stamps.push('findings @ ' + DATA.findings.meta.generated);
    if (DATA.findings && DATA.findings.meta && DATA.findings.meta.total != null) stamps.push(DATA.findings.meta.total + ' findings');
    else if (DATA.findings && DATA.findings.findings) stamps.push(DATA.findings.findings.length + ' findings');
    if (DATA.competitors && DATA.competitors.meta) stamps.push('competitors @ ' + DATA.competitors.meta.validation_status);
    else stamps.push('competitors: dark');
    meta.textContent = 'scores.json · gates.json · findings.json · competitors.json' + (stamps.length ? ' // ' + stamps.join(' · ') : '');
  }

  function renderCompetitors(payload) {
    var host = $('#intel-field');
    if (!host) return;
    var validated = payload && payload.meta && payload.meta.validation_status === 'validated';
    if (!validated) {
      host.innerHTML = '<div class="intel-dark"><p class="intel-dark-title">THE PLATE IS <em>DARK.</em></p>' +
        '<p class="intel-dark-note">' + (payload ? 'VALIDATION NOT PASSED // NO CRAWL-BACKED INTEL ON THE BOARD' : 'AWAITING CRAWL OUTPUT // COMPETITORS.JSON NOT ON THE WIRE') + '</p></div>';
      return;
    }
    var comps = payload.competitors || [];
    var gaps = payload.gaps || [];
    var wins = payload.wins || [];
    var html = '<div class="intel-grid" role="list" aria-label="Competitor dossiers">' + comps.map(dossierHTML).join('') + '</div>';
    var tables = '';
    if (gaps.length) tables += intelTable('gaps', 'GAP TABLE // WHAT THE FIELD HAS THAT PATRIOT LACKS', gaps);
    if (wins.length) tables += intelTable('wins', 'DOING IT BETTER // WHERE PATRIOT WINS', wins);
    if (tables) html += '<div class="intel-tables">' + tables + '</div>';
    host.innerHTML = html;
    $all('.dossier-btn', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('open', !open);
      });
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    startClock();
    startProgress();
    startNavSpy();

    var base = '../data/';
    Promise.all([
      fetchJSON(base + 'scores.json'),
      fetchJSON(base + 'gates.json'),
      fetchJSON(base + 'findings.json')
    ]).then(function (res) {
      DATA.scores = res[0];
      DATA.gates = res[1];
      DATA.findings = res[2];

      renderDials(DATA.scores);
      renderVerdict(DATA.scores);
      renderFindings(DATA.findings);
      renderGates(DATA.gates);

      /* reveal pass after DOM is populated */
      startReveals();

      /* dial animation once scorecard enters view */
      var consoleEl = $('#scorecard');
      var fired = false;
      function fire() { if (!fired) { fired = true; animateDials(); } }
      if (REDUCED || !('IntersectionObserver' in window)) {
        fire();
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { fire(); io.disconnect(); } });
        }, { threshold: 0.15 });
        io.observe(consoleEl);
      }

      /* data-layer freshness stamp */
      refreshColophon();
    }).catch(function (err) {
      var host = $('#finding-list');
      if (host) host.innerHTML = '<p class="empty-state">// DATA LAYER UNREACHABLE: ' + esc(err.message) + '</p>';
      if (window.console) console.error('AUDIT.SYS boot failure:', err);
    });

    /* competitor intel plate: independent fetch, dark state on absence */
    fetchJSON(base + 'competitors.json').then(function (comp) {
      DATA.competitors = comp;
      renderCompetitors(comp);
      intelStatus(comp);
      intelMeta(comp);
      refreshColophon();
      startReveals();
    }).catch(function () {
      renderCompetitors(null);
      intelStatus(null);
      intelMeta(null);
      refreshColophon();
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
