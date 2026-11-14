/* Al Baseera shared UI kit — theme engine, icon resolver, injected nav strip.
   Loaded with `defer` on every page (the home page sets <html data-ab-home>
   and renders its own masthead; the strip is skipped there).
   Settings persist in localStorage and apply site-wide. */
(function () {
  'use strict';

  var script = document.currentScript;
  var ROOT = script && script.src ? script.src.replace(/assets\/ui\.js.*$/, '') : '';
  var AB = window.AB = window.AB || {};
  AB.STAFF_HASH = '66b04ccd8435deb7fd21bb6b8e67491689bf13c324fa976de7759b9f25e660e7';
  AB.root = ROOT;

  /* ---------------- settings ---------------- */
  var DEFAULTS = { theme: 'auto', icons: 'emoji', nav: 'tabs', list: 'default', rail: 'show', adminView: 'staff', forceView: 'auto', navStyle: 'mega' };
  var S;
  try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('ab-settings') || '{}')); }
  catch (e) { S = Object.assign({}, DEFAULTS); }
  AB.settings = S;
  AB.applyAdmin = function () {
    /* signed-in staff can peek at the student view without signing out */
    if (S.admin === 'on' && S.adminView !== 'student') {
      document.documentElement.dataset.abAdmin = 'on';
    } else {
      delete document.documentElement.dataset.abAdmin;
    }
    document.dispatchEvent(new CustomEvent('ab:admin'));
  };
  AB.visibleSections = function (nav) {
    return nav.sections.filter(function (s) {
      return !s.adminOnly || document.documentElement.dataset.abAdmin === 'on';
    });
  };
  AB.applyAdmin();
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

  /* ---------------- device-view override (set from the Admin Panel) ----------------
     'mobile' previews the phone layout on a desktop; 'desktop' asks phones for the
     full-width layout (classic "request desktop site"). 'auto' = responsive. */
  AB.applyForceView = function () {
    document.documentElement.classList.toggle('ab-vm-mobile', S.forceView === 'mobile');
    if (S.forceView === 'desktop') {
      var vp = document.querySelector('meta[name="viewport"]');
      if (vp) vp.setAttribute('content', 'width=1100');
    }
  };
  AB.applyForceView();

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
    row('Icons', seg('icons',
      [['emoji', 'Emoji'], ['svg', 'Hand-drawn']],
      function () { document.dispatchEvent(new CustomEvent('ab:icons')); }));
    (extraRows || []).forEach(function (r) { row(r[0], seg(r[1], r[2], r[3])); });
    /* Staff mode — a UI curtain only, not security: it tidies teacher tooling
       out of student view. Real auth arrives with the Phase F backend. */
    var sh = document.createElement('h4'); sh.textContent = 'Staff';
    var viewSeg = null;
    var sb = document.createElement('button');
    sb.type = 'button'; sb.className = 'ab-staffbtn';
    function staffLabel() {
      sb.textContent = S.admin === 'on' ? 'Sign out of staff mode' : 'Staff sign-in\u2026';
      if (viewSeg) viewSeg.style.display = S.admin === 'on' ? '' : 'none';
    }
    /* View-as switcher: only visible once signed in; no re-verify to flip */
    viewSeg = seg('adminView', [['staff', 'Staff view'], ['student', 'Student view']],
      function () { AB.applyAdmin(); });
    viewSeg.style.marginBottom = '.35rem';
    sb.onclick = function () {
      if (S.admin === 'on') {
        S.admin = 'off'; AB.save();
        AB.applyAdmin();
        staffLabel(); return;
      }
      var p = window.prompt('Staff passphrase:');
      if (p == null) return;
      var enc = new TextEncoder().encode(p.trim());
      crypto.subtle.digest('SHA-256', enc).then(function (buf) {
        var hex = Array.from(new Uint8Array(buf)).map(function (b) {
          return b.toString(16).padStart(2, '0'); }).join('');
        if (hex === AB.STAFF_HASH) {
          S.admin = 'on'; S.adminView = 'staff'; AB.save();
          viewSeg.querySelectorAll('button').forEach(function (x) {
            x.classList.toggle('on', x.dataset.v === 'staff');
          });
          AB.applyAdmin();
          staffLabel();
        } else {
          window.alert('That passphrase was not recognized.');
        }
      });
    };
    staffLabel();
    pop.appendChild(sh); pop.appendChild(viewSeg); pop.appendChild(sb);
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

  var SECTION_COLOR = { gold: '#c9a13b', general: '#3a3f4d', arabic: '#1b2a5e', quran: '#4d1b30', islamic: '#1b4d38', games: '#14555c', practice: '#a85318', admin: '#4a4466' };
  var SECTION_LUM = { gold: '#d2ac4b', general: '#aeb6c9', arabic: '#8fa2e8', quran: '#d98aa6', islamic: '#7fc9a4', games: '#7bc8cf', practice: '#e0a35c', admin: '#b1a3e3' };
  var SECTION_DEEP = { gold: '#8a6d22', games: '#8a6d22', practice: '#8a4512' };
  function tabVars(color) {
    return '--tabc:' + (SECTION_COLOR[color] || '#c9a13b') + ';--tabcl:' + (SECTION_LUM[color] || '#d2ac4b') +
      ';--tabcd:' + (SECTION_DEEP[color] || SECTION_COLOR[color] || '#8a6d22');
  }
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

    var menuBtn = document.createElement('button');
    menuBtn.className = 'ab-iconbtn'; menuBtn.title = 'All pages'; menuBtn.textContent = '\u2630';
    menuBtn.setAttribute('aria-label', 'Open the page directory');
    row.appendChild(menuBtn);

    var logo = document.createElement('a');
    logo.className = 'ab-mini-logo'; logo.href = ROOT; logo.title = 'Al Baseera Academy — Home';
    var img = document.createElement('img');
    img.src = ROOT + 'assets/logo.jpeg'; img.alt = 'Al Baseera Academy';
    img.onerror = function () { img.replaceWith(AB.fallbackLogo()); };
    logo.appendChild(img);
    row.appendChild(logo);

    var tabs = document.createElement('nav');
    tabs.className = 'ab-tabs'; tabs.setAttribute('aria-label', 'Sections');
    var split = S.navStyle === 'split';
    function renderTabs() {
      tabs.innerHTML = AB.visibleSections(nav).map(function (s) {
        return '<a class="ab-tab' + (section && s.id === section.id ? ' on' : '') +
          '" data-sec="' + s.id + '" style="' + tabVars(s.color) + '" href="' + ROOT + '?tab=' + s.id + '">' +
          AB.icon(s.icon, s.emoji) + s.title +
          (split ? '<span class="ab-chev" aria-label="Pages in ' + s.title + '">\u25be</span>' : '') +
        '</a>';
      }).join('');
    }
    renderTabs();
    document.addEventListener('ab:icons', renderTabs);
    document.addEventListener('ab:admin', renderTabs);
    row.appendChild(tabs);

    /* ---- mega-menu: tab click shows the section's pages in place ---- */
    var mega = document.createElement('div');
    mega.className = 'ab-mega';
    var megaSec = null;
    function openMega(id) {
      var s = AB.visibleSections(nav).find(function (x) { return x.id === id; });
      if (!s) return;
      megaSec = id;
      var color = SECTION_COLOR[s.color] || '#c9a13b';
      var gmap = (nav.groups && nav.groups[s.id]) || null;
      function link(p) {
        return '<a class="' + (p.href === path ? 'here' : '') + '" href="' + ROOT + p.href + '">' +
          p.en + (p.status === 'soon' ? ' \u25cc' : '') + '</a>';
      }
      var cols = '';
      if (gmap) {
        Object.keys(gmap).forEach(function (g) {
          var items = s.pages.filter(function (p) { return gmap[g].indexOf(p.href) > -1; });
          if (!items.length) return;
          cols += '<div><div class="mg">' + g + '</div>' + items.map(link).join('') + '</div>';
        });
      } else {
        cols = '<div>' + s.pages.map(link).join('') + '</div>';
      }
      mega.style.setProperty('--tabc', color);
      mega.style.setProperty('--tabcl', SECTION_LUM[s.color] || '#d2ac4b');
      mega.innerHTML = cols +
        '<div class="mfoot">\u21b3 <a href="' + ROOT + '?tab=' + s.id + '">Open the ' + s.title + ' section overview</a></div>';
      mega.classList.add('open');
    }
    function closeMega() { mega.classList.remove('open'); megaSec = null; }
    tabs.addEventListener('click', function (e) {
      var a = e.target.closest('a.ab-tab');
      if (!a) return;
      if (S.navStyle === 'rail') return;                   /* rail mode: tabs navigate */
      if (split && !e.target.closest('.ab-chev')) return;  /* split: only the chevron opens */
      e.preventDefault();
      var id = a.dataset.sec;
      megaSec === id ? closeMega() : openMega(id);
    });
    document.addEventListener('click', function (e) {
      if (!strip.contains(e.target)) closeMega();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMega(); });
    strip.appendChild(mega);

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
      (section ? '<span class="sep">❯</span><a class="sec" style="' + tabVars(section.color) + '" href="' + ROOT + '?tab=' + section.id + '">' +
        section.title + '</a>' : '') +
      (page ? '<span class="sep">❯</span><span class="here">' + page.en + '</span>' : '');
    strip.appendChild(crumbs);

    document.body.insertBefore(strip, document.body.firstChild);
    document.body.classList.add('ab-has-strip');

    /* ---- the page directory drawer: the whole site, current section open ---- */
    var drawer = document.createElement('nav');
    drawer.className = 'ab-drawer';
    drawer.setAttribute('aria-label', 'All pages');
    function renderDrawer() {
      drawer.innerHTML = '<div class="ab-drawer-head">Al Baseera Academy' +
        '<button class="ab-drawer-x" aria-label="Close">\u2715</button></div>' +
        '<a class="ab-dr-home" href="' + ROOT + '">\u2302 Home</a>' +
        AB.visibleSections(nav).map(function (s) {
          var open = section && s.id === section.id;
          var gmap = (nav.groups && nav.groups[s.id]) || null;
          var inner = '';
          function link(p) {
            var here = p.href === path;
            return '<a class="ab-dr-page' + (here ? ' here' : '') + '" href="' + ROOT + p.href + '">' +
              p.en + (p.status === 'soon' ? ' \u25cc' : '') + '</a>';
          }
          if (gmap) {
            Object.keys(gmap).forEach(function (g) {
              var items = s.pages.filter(function (p) { return gmap[g].indexOf(p.href) > -1; });
              if (!items.length) return;
              inner += '<div class="ab-dr-group">' + g + '</div>' + items.map(link).join('');
            });
          } else {
            inner = s.pages.map(link).join('');
          }
          return '<details class="ab-dr-sec"' + (open ? ' open' : '') +
            ' style="' + tabVars(s.color) + '">' +
            '<summary>' + AB.icon(s.icon, s.emoji) + ' ' + s.title + '</summary>' +
            '<div class="ab-dr-body">' + inner + '</div></details>';
        }).join('');
    }
    renderDrawer();
    document.addEventListener('ab:icons', renderDrawer);
    document.addEventListener('ab:admin', renderDrawer);
    var backdrop = document.createElement('div');
    backdrop.className = 'ab-drawer-backdrop';
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    function setDrawer(open) {
      document.body.classList.toggle('ab-drawer-open', open);
    }
    var wide = window.matchMedia('(min-width: 900px)');
    if (S.navStyle === 'rail' && wide.matches) {
      document.body.classList.add('ab-docked');   /* drawer becomes a fixed sidebar */
    }
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (S.navStyle === 'rail' && wide.matches) {
        document.body.classList.toggle('ab-docked');
        return;
      }
      setDrawer(true);
    });
    backdrop.addEventListener('click', function () { setDrawer(false); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('.ab-drawer-x')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setDrawer(false);
    });
  }

  if (!document.documentElement.hasAttribute('data-ab-home')) {
    AB.navReady.then(injectStrip).catch(function (e) {
      console.error('Al Baseera UI kit: nav.json failed to load —', e);
    });
  }
})();
