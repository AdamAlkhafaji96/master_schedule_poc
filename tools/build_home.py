"""Assemble index.html (the portal home) from staged parts + the new UI layer.

The home renders its section tabs and cards from assets/nav.json, keeps the
hijri season banner, announcements forum and Connect panel exactly as they
were (their CSS, markup and scripts are carried over verbatim), and adds the
shared settings (theme / icons / navigation / list style) via assets/ui.js.
Run from the site root: python3 tools/build_home.py
"""
import json

P = json.load(open('/tmp/claude-0/-home-claude/fc2d496e-c242-5302-88e2-5410154ae9d1/scratchpad/home_parts.json'))

NEW_CSS = """
  /* ——— masthead, gilded tabs, cards (UI refresh) ——— */
  .masthead { position: sticky; top: 0; z-index: 80; background: var(--vellum); border-bottom: 1px solid var(--vellum-dim); }
  .mast-row { max-width: 1020px; margin: 0 auto; padding: .5rem 1rem .4rem; display: flex; align-items: center; gap: .7rem; }
  .mast-row .mini { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--gold); overflow: hidden; flex: none; background: #fff; display: grid; place-items: center; }
  .mast-row .mini img, .mast-row .mini svg { width: 100%; height: 100%; object-fit: cover; display: block; }
  .mast-row .wm { line-height: 1.12; }
  .mast-row .wm .en { font-weight: 600; font-size: .98rem; }
  .mast-row .wm .ar { font-family: 'Amiri', serif; font-size: .84rem; color: var(--gold); }
  .mast-actions { margin-left: auto; display: flex; gap: .4rem; align-items: center; }
  .tabsrow { max-width: 1020px; margin: 0 auto; padding: 0 1rem; display: flex; gap: .35rem; overflow-x: auto; scrollbar-width: none; }
  .tabsrow::-webkit-scrollbar { display: none; }
  .mtab { font: inherit; font-size: .88rem; cursor: pointer; white-space: nowrap; background: #fff; color: var(--ab-muted, #6b6d85); border: 1px solid var(--vellum-dim); border-bottom: none; border-radius: 10px 10px 0 0; padding: .48rem .9rem .5rem; display: inline-flex; align-items: center; gap: .45rem; position: relative; top: 1px; }
  html[data-theme="dark"] .mtab { background: var(--ab-surface); }
  .mtab[aria-selected="true"] { color: var(--ink); font-weight: 600; border-color: var(--tabc, var(--gold)); border-top-width: 3px; background: var(--vellum); }
  .mtab[aria-selected="true"]::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--vellum); }
  body[data-nav="scroll"] .tabsrow { display: none; }

  main { max-width: 1020px; margin: 1.1rem auto 2.4rem; padding: 0 1rem; }
  .pane-head { display: flex; align-items: baseline; gap: .7rem; margin: 1.1rem 0 .7rem; }
  .pane-head h2 { font-weight: 500; font-size: 1.3rem; display: flex; align-items: center; gap: .5rem; color: var(--sc, var(--ink)); }
  .pane-head .tagline { font-size: .8rem; color: #9a9cb3; font-style: italic; }
  .pane-head .ruleline { flex: 1; height: 1px; background: var(--vellum-dim); align-self: center; }
  .cardgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: .7rem; }
  a.pcard { background: #fff; text-decoration: none; color: inherit; border: 1px solid var(--vellum-dim); border-left: 4px solid var(--sc, var(--gold)); border-radius: 11px; padding: .72rem .9rem .66rem; display: flex; flex-direction: column; gap: .16rem; position: relative; }
  html[data-theme="dark"] a.pcard { background: var(--ab-surface); border-color: var(--ab-rule); }
  a.pcard:hover { border-color: var(--sc, var(--gold)); box-shadow: var(--ab-shadow, 0 10px 28px rgba(34,36,58,.12)); }
  .pcard .l1 { display: flex; align-items: baseline; gap: .45rem; padding-right: 3.2rem; }
  .pcard .ab-em { font-size: 1.02rem; } .pcard .ab-ic { width: 1.15em; height: 1.15em; color: var(--sc); }
  .pcard .nm { font-weight: 600; font-size: .94rem; }
  .pcard .arb { font-family: 'Amiri', serif; color: var(--sc, #6b6d85); margin-left: auto; font-size: 1.02rem; }
  .pcard .ds { font-size: .78rem; color: #6b6d85; line-height: 1.4; }
  html[data-theme="dark"] .pcard .ds { color: var(--ab-muted); }
  .pcard .ab-status { position: absolute; top: .58rem; right: .62rem; }
  .pcard .ab-hovercard { left: .6rem; right: .6rem; top: calc(100% - 6px); }
  .pcard:hover .ab-hovercard, .pcard:focus-visible .ab-hovercard { opacity: 1; visibility: visible; }

  details.pack { border: 1px solid var(--vellum-dim); border-radius: 11px; background: #fff; margin-bottom: .7rem; overflow: hidden; }
  html[data-theme="dark"] details.pack { background: var(--ab-surface); border-color: var(--ab-rule); }
  details.pack summary { list-style: none; cursor: pointer; padding: .66rem 1rem; display: flex; align-items: center; gap: .6rem; font-weight: 500; }
  details.pack summary::-webkit-details-marker { display: none; }
  details.pack summary .chev { margin-left: auto; color: var(--gold); transition: transform .18s; }
  details.pack[open] summary .chev { transform: rotate(90deg); }
  details.pack summary .cnt { font-size: .72rem; color: #9a9cb3; }
  details.pack .packbody { padding: 0 .8rem .8rem; }

  .rail { display: none; position: fixed; left: max(8px, calc(50vw - 510px - 148px)); top: 150px; width: 132px; font-size: .8rem; }
  body[data-nav="scroll"] .rail { display: block; }
  @media (max-width: 1330px) { body[data-nav="scroll"] .rail { display: none; } }
  .rail a { display: flex; gap: .4rem; align-items: center; text-decoration: none; color: #6b6d85; padding: .3rem .55rem; border-left: 2px solid var(--vellum-dim); }
  .rail a.on { color: var(--ink); font-weight: 600; border-left-color: var(--gold); }
  body[data-nav="scroll"] section.pane { display: block !important; }

  .announce-wrap, .banner-wrap { max-width: 1020px; margin: 0 auto; padding: 0 1rem; }
  header.hero { padding-top: 1.6rem; }
  header.hero .logo { width: clamp(96px, 16vw, 136px); }
  @media (prefers-reduced-motion: reduce) { .mtab, details.pack summary .chev { transition: none !important; } }
"""

HOME_JS = """
/* ============== Home UI layer — nav.json-driven tabs, cards, settings ============== */
document.addEventListener('DOMContentLoaded', function () {
  var S = AB.settings;
  var COLOR = { gold: 'var(--gold)', general: '#3a3f4d', arabic: '#1b2a5e', quran: '#4d1b30', islamic: '#1b4d38' };
  var state = { tab: new URLSearchParams(location.search).get('tab') || 'general' };

  document.querySelectorAll('.mini img').forEach(function (img) {
    img.onerror = function () { img.replaceWith(AB.fallbackLogo()); };
  });

  AB.navReady.then(function (nav) {
    if (!nav.sections.some(function (s) { return s.id === state.tab; })) state.tab = 'general';

    function card(sec, p) {
      var st = p.status === 'live'
        ? '<span class="ab-status live"><i>●</i>live</span>'
        : '<span class="ab-status soon"><i>◌</i>soon</span>';
      return '<a class="pcard" href="' + p.href + '" style="--sc:' + COLOR[sec.color] + '">' + st +
        '<span class="l1">' + AB.icon(p.icon, p.emoji) + '<span class="nm">' + p.en + '</span>' +
        (p.ar ? '<span class="arb">' + p.ar + '</span>' : '') + '</span>' +
        '<span class="ds">' + p.desc + '</span>' +
        '<span class="ab-hovercard"><b>' + p.en + '</b> — ' + p.desc + '.<br>' +
        (p.status === 'live' ? 'Built and ready.' : 'Page is up; content still being added.') + '</span></a>';
    }

    function paneHTML(sec) {
      var body;
      if (sec.id === 'general' && nav.generalGroups) {
        var groups = Object.keys(nav.generalGroups);
        body = groups.map(function (g, i) {
          var hrefs = nav.generalGroups[g];
          var items = sec.pages.filter(function (p) { return hrefs.indexOf(p.href) > -1; });
          return '<details class="pack"' + (i === 0 ? ' open' : '') + '><summary>' + g +
            ' <span class="cnt">' + items.length + ' pages</span><span class="chev">▶</span></summary>' +
            '<div class="packbody"><div class="cardgrid">' +
            items.map(function (p) { return card(sec, p); }).join('') + '</div></div></details>';
        }).join('');
        var grouped = [].concat.apply([], groups.map(function (g) { return nav.generalGroups[g]; }));
        var rest = sec.pages.filter(function (p) { return grouped.indexOf(p.href) < 0; });
        if (rest.length) body += '<div class="cardgrid">' +
          rest.map(function (p) { return card(sec, p); }).join('') + '</div>';
      } else {
        body = '<div class="cardgrid">' + sec.pages.map(function (p) { return card(sec, p); }).join('') + '</div>';
      }
      return '<section class="pane" id="pane-' + sec.id + '" style="--sc:' + COLOR[sec.color] + '"' +
        (S.nav === 'scroll' || state.tab === sec.id ? '' : ' hidden') + '>' +
        '<div class="pane-head"><h2>' + AB.icon(sec.icon, sec.emoji) + sec.title + '</h2>' +
        '<span class="tagline">' + sec.tag + '</span><span class="ruleline"></span></div>' + body + '</section>';
    }

    function render() {
      document.body.dataset.nav = S.nav;
      document.getElementById('panes').innerHTML = nav.sections.map(paneHTML).join('');
      var tr = document.getElementById('tabsrow');
      tr.innerHTML = nav.sections.map(function (s) {
        return '<button class="mtab" role="tab" data-t="' + s.id +
          '" aria-selected="' + (state.tab === s.id) + '" style="--tabc:' + COLOR[s.color] + '">' +
          AB.icon(s.icon, s.emoji) + s.title + '</button>';
      }).join('');
      tr.querySelectorAll('.mtab').forEach(function (b) {
        b.onclick = function () {
          state.tab = b.dataset.t;
          history.replaceState(null, '', '?tab=' + state.tab);
          render();
        };
      });
      document.getElementById('rail').innerHTML = nav.sections.map(function (s) {
        return '<a href="#pane-' + s.id + '" data-r="' + s.id + '">' +
          AB.icon(s.icon, s.emoji) + ' ' + s.title + '</a>';
      }).join('');
    }
    render();
    document.addEventListener('ab:icons', render);
    document.addEventListener('ab:theme', function () {});

    addEventListener('scroll', function () {
      if (S.nav !== 'scroll') return;
      var cur = null;
      document.querySelectorAll('section.pane').forEach(function (sec) {
        if (sec.getBoundingClientRect().top < 170) cur = sec.id.replace('pane-', '');
      });
      document.querySelectorAll('.rail a').forEach(function (a) {
        a.classList.toggle('on', a.dataset.r === cur);
      });
    }, { passive: true });

    /* theme button + gear with the two home-only settings */
    var tb = document.getElementById('themeBtn');
    function glyph() { tb.textContent = S.theme === 'auto' ? '◐' : (S.theme === 'dark' ? '☾' : '☀'); }
    glyph();
    tb.onclick = function () {
      S.theme = S.theme === 'auto' ? 'dark' : (S.theme === 'dark' ? 'light' : 'auto');
      AB.save(); AB.applyTheme(); glyph(); syncPop();
    };
    var pop = AB.buildPopover([
      ['Navigation', 'nav', [['tabs', 'Tabs'], ['scroll', 'Scroll + rail']], render],
      ['Long lists', 'list', [['default', 'Per page'], ['pages', 'Paginate'], ['infinite', 'Infinite']], null]
    ]);
    var gear = document.getElementById('gearBtn');
    pop._btn = gear;
    document.getElementById('gearWrap').appendChild(pop);
    gear.onclick = function (e) { e.stopPropagation(); pop.classList.toggle('open'); };
    function syncPop() {
      var segs = pop.querySelectorAll('.ab-seg');
      if (segs[0]) segs[0].querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('on', x.dataset.v === S.theme);
      });
    }
  }).catch(function (e) {
    document.getElementById('panes').innerHTML =
      '<p style="text-align:center;color:#a33028">Navigation failed to load (assets/nav.json): ' + e + '</p>';
  });
});
"""

html = f"""<!DOCTYPE html>
<html lang="en" data-ab-home>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Al Baseera — Learning Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Spectral:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/theme.css">
<style>
{P['root']}

{P['base']}

{P['feat_css']}

{NEW_CSS}
</style>
</head>
<body data-nav="tabs">

<div class="masthead">
  <div class="mast-row">
    <a class="mini" href="./" title="Al Baseera Academy"><img src="assets/logo.jpeg" alt="Al Baseera Academy"></a>
    <div class="wm">
      <div class="en">Al Baseera Learning Portal</div>
      <div class="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    </div>
    <div class="mast-actions">
      <button class="ab-iconbtn" id="themeBtn" title="Theme">◐</button>
      <div class="ab-popwrap" id="gearWrap">
        <button class="ab-iconbtn" id="gearBtn" title="Settings">⚙</button>
      </div>
    </div>
  </div>
  <div class="tabsrow" id="tabsrow" role="tablist"></div>
</div>

<header class="hero">
  <img class="logo" src="assets/logo.jpeg" alt="Al Baseera Academy"
       onerror="this.style.display='none'">
  <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
  <h1>Al Baseera Learning Portal</h1>
  <p>Choose a section to begin</p>
</header>

<div class="banner-wrap">
{P['banner']}
  </div>
</div>

<div class="announce-wrap">
  {P['announce']}
</div>

<nav class="rail" id="rail" aria-label="Sections"></nav>

<main id="panes"></main>

{P['connect']}

{P['footer']}

<script defer src="assets/ui.js"></script>
<script>
{P['scripts']}
{HOME_JS}
</script>
</body>
</html>
"""
open('index.html', 'w').write(html)
print('index.html rebuilt:', len(html), 'bytes')
