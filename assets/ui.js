/* Al Baseera shared UI kit — theme engine, icon resolver, injected nav strip.
   Loaded with `defer` on every page (the home page sets <html data-ab-home>
   and renders its own masthead; the strip is skipped there).
   Settings persist in localStorage and apply site-wide. */
(function () {
  'use strict';

  var script = document.currentScript;
  var ROOT = script && script.src ? script.src.replace(/assets\/ui\.js.*$/, '') : '';
  var AB = window.AB = window.AB || {};
  AB.root = ROOT;

  /* ---------------- settings ---------------- */
  var DEFAULTS = { theme: 'auto', icons: 'emoji', nav: 'tabs', list: 'default', rail: 'show' };
  var S;
  try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('ab-settings') || '{}')); }
  catch (e) { S = Object.assign({}, DEFAULTS); }
  AB.settings = S;
  AB.save = function () { try { localStorage.setItem('ab-settings', JSON.stringify(S)); } catch (e) {} };

  /* ---------------- theme engine ---------------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  AB.lightLocked = false;              /* set from nav.json for this page */
  AB.applyTheme = function () {
    var dark = !AB.lightLocked &&
      (S.theme === 'dark' || (S.theme === 'auto' && mq.matches));
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.dispatchEvent(new CustomEvent('ab:theme', { detail: { dark: dark } }));
  };
  if (mq.addEventListener) mq.addEventListener('change', AB.applyTheme);
  AB.applyTheme();

  /* ---------------- icon resolver ---------------- */
  AB.icon = function (name, emoji) {
    if (S.icons === 'svg' && name) {
      return '<svg class="ab-ic" aria-hidden="true"><use href="' + ROOT +
        'assets/icons.svg#' + name + '"></use></svg>';
    }
    return '<span class="ab-em" aria-hidden="true">' + (emoji || '') + '</span>';
  };

  /* ---------------- logo fallback ---------------- */
  AB.fallbackLogo = function () {
    var d = document.createElement('span');
    d.innerHTML = '<svg viewBox="0 0 100 100" role="img" aria-label="Al Baseera Academy">' +
      '<circle cx="50" cy="50" r="48" fill="#1b4d38"/>' +
      '<circle cx="50" cy="50" r="48" fill="none" stroke="#c9a13b" stroke-width="4"/>' +
      '<text x="50" y="64" text-anchor="middle" font-family="Amiri,serif" ' +
      'font-size="44" fill="#f7f2e7">ب</text></svg>';
    return d.firstChild;
  };

  /* ---------------- settings popover (shared builder) ---------------- */
  function seg(key, options, onPick) {
    var wrap = document.createElement('div');
    wrap.className = 'ab-seg';
    options.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = o[1]; b.dataset.v = o[0];
      if (S[key] === o[0]) b.classList.add('on');
      b.onclick = function () {
        S[key] = o[0]; AB.save();
        wrap.querySelectorAll('button').forEach(function (x) {
          x.classList.toggle('on', x === b);
        });
        if (onPick) onPick(o[0]);
      };
      wrap.appendChild(b);
    });
    return wrap;
  }
  AB.buildPopover = function (extraRows) {
    var pop = document.createElement('div');
    pop.className = 'ab-pop';
    function row(title, el) {
      var h = document.createElement('h4'); h.textContent = title;
      pop.appendChild(h); pop.appendChild(el);
    }
    row('Theme', seg('theme',
      [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']],
      function () { AB.applyTheme(); }));
    row('Icons', seg('icons',
      [['emoji', 'Emoji'], ['svg', 'Hand-drawn']],
      function () { document.dispatchEvent(new CustomEvent('ab:icons')); }));
    (extraRows || []).forEach(function (r) { row(r[0], seg(r[1], r[2], r[3])); });
    if (AB.lightLocked) {
      var n = document.createElement('div');
      n.className = 'hint';
      n.textContent = 'This page keeps its light palette so the colors stay readable; the rest of the site follows your theme.';
      pop.appendChild(n);
    }
    document.addEventListener('click', function (e) {
      if (!pop.contains(e.target) && pop.classList.contains('open') &&
          !(pop._btn && pop._btn.contains(e.target))) {
        pop.classList.remove('open');
      }
    });
    return pop;
  };

  /* ---------------- nav data + strip injection ---------------- */
  AB.navReady = fetch(ROOT + 'assets/nav.json')
    .then(function (r) { return r.json(); })
    .then(function (nav) { AB.nav = nav; return nav; });

  function pagePath() {
    var here = location.pathname.replace(/index\.html$/, '');
    var rootPath = new URL(ROOT, location.href).pathname;
    return here.indexOf(rootPath) === 0 ? here.slice(rootPath.length) : here;
  }

  var SECTION_COLOR = { gold: '#c9a13b', general: '#3a3f4d', arabic: '#1b2a5e', quran: '#4d1b30', islamic: '#1b4d38', games: '#14555c' };
  function injectStrip(nav) {
    var path = pagePath();
    if (nav.chromeless.some(function (c) { return path === c; })) return;
    AB.lightLocked = nav.lightLocked.some(function (c) { return path === c; });
    AB.applyTheme();

    var section = null, page = null;
    nav.sections.forEach(function (s) {
      s.pages.forEach(function (p) { if (p.href === path) { section = s; page = p; } });
    });
    document.documentElement.dataset.abSec = section ? section.color : '';

    var strip = document.createElement('div');
    strip.className = 'ab-strip';
    var row = document.createElement('div');
    row.className = 'ab-strip-row';

    var logo = document.createElement('a');
    logo.className = 'ab-mini-logo'; logo.href = ROOT; logo.title = 'Al Baseera — Home';
    var img = document.createElement('img');
    img.src = ROOT + 'assets/logo.jpeg'; img.alt = 'Al Baseera Academy';
    img.onerror = function () { img.replaceWith(AB.fallbackLogo()); };
    logo.appendChild(img);
    row.appendChild(logo);

    var tabs = document.createElement('nav');
    tabs.className = 'ab-tabs'; tabs.setAttribute('aria-label', 'Sections');
    function renderTabs() {
      tabs.innerHTML = nav.sections.map(function (s) {
        return '<a class="ab-tab' + (section && s.id === section.id ? ' on' : '') +
          '" style="--tabc:' + (SECTION_COLOR[s.color] || '#c9a13b') + '" href="' + ROOT + '?tab=' + s.id + '">' +
          AB.icon(s.icon, s.emoji) + s.title + '</a>';
      }).join('');
    }
    renderTabs();
    document.addEventListener('ab:icons', renderTabs);
    row.appendChild(tabs);

    var themeBtn = document.createElement('button');
    themeBtn.className = 'ab-iconbtn'; themeBtn.title = 'Theme';
    function themeGlyph() {
      themeBtn.textContent = S.theme === 'auto' ? '◐' : (S.theme === 'dark' ? '☾' : '☀');
    }
    themeGlyph();
    themeBtn.onclick = function () {
      S.theme = S.theme === 'auto' ? 'dark' : (S.theme === 'dark' ? 'light' : 'auto');
      AB.save(); AB.applyTheme(); themeGlyph();
      if (pop) pop.querySelectorAll('.ab-seg')[0].querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('on', x.dataset.v === S.theme);
      });
    };
    document.addEventListener('ab:theme', themeGlyph);

    var gearWrap = document.createElement('div');
    gearWrap.className = 'ab-popwrap';
    var gear = document.createElement('button');
    gear.className = 'ab-iconbtn'; gear.title = 'Settings'; gear.textContent = '⚙';
    var pop = AB.buildPopover();
    pop._btn = gear;
    gear.onclick = function (e) { e.stopPropagation(); pop.classList.toggle('open'); };
    gearWrap.appendChild(gear); gearWrap.appendChild(pop);

    row.appendChild(themeBtn);
    row.appendChild(gearWrap);
    strip.appendChild(row);

    var crumbs = document.createElement('div');
    crumbs.className = 'ab-crumbs';
    crumbs.innerHTML = '<a href="' + ROOT + '">Home</a>' +
      (section ? '<span class="sep">❯</span><a class="sec" style="--tabc:' +
        (SECTION_COLOR[section.color] || '#c9a13b') + '" href="' + ROOT + '?tab=' + section.id + '">' +
        section.title + '</a>' : '') +
      (page ? '<span class="sep">❯</span><span class="here">' + page.en + '</span>' : '');
    strip.appendChild(crumbs);

    document.body.insertBefore(strip, document.body.firstChild);
    document.body.classList.add('ab-has-strip');
  }

  if (!document.documentElement.hasAttribute('data-ab-home')) {
    AB.navReady.then(injectStrip).catch(function (e) {
      console.error('Al Baseera UI kit: nav.json failed to load —', e);
    });
  }
})();
