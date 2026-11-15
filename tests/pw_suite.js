const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  let pass = 0, fail = 0;
  const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL:', m)); };
  const U = p => (process.env.BASE_URL || 'http://localhost:8777') + '/' + p;
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
    await pg.goto(U('index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => document.body.dataset.rail) === 'off', 'mobile: drawer closed by default');
    ok((await pg.evaluate(() => document.title)).includes('Academy'), 'title has Academy');
    await pg.click('#railBtn'); await pg.waitForTimeout(250);
    ok(await pg.evaluate(() => document.body.dataset.rail) === 'on', 'mobile: hamburger opens drawer');
    const railBox = await pg.evaluate(() => { const r = document.getElementById('rail'); const cs = getComputedStyle(r); return { pos: cs.position, z: cs.zIndex }; });
    ok(railBox.pos === 'fixed' && +railBox.z >= 120, 'mobile: drawer is overlay');
    await pg.mouse.click(370, 500); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => document.body.dataset.rail) === 'off', 'mobile: tap-away closes drawer');
    ok(await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0, 'mobile: no hscroll');
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#pane-general > summary.pane-head')).display) === 'none', 'tabs mode: duplicate banner hidden');
    await pg.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await pg.goto(U('index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => document.body.dataset.rail) === 'on', 'desktop: rail shown by default');
    const r = await pg.evaluate(() => ({ pos: getComputedStyle(document.getElementById('rail')).position, pad: getComputedStyle(document.body).paddingLeft }));
    ok(r.pos === 'fixed' && r.pad === '236px', 'desktop: docked sidebar + offset');
    await pg.click('#railBtn'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(() => getComputedStyle(document.body).paddingLeft) === '0px', 'desktop: hamburger collapses sidebar');
    await pg.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
    await pg.goto(U('quran/text/index.html?s=1'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
    ok(await pg.locator('.ayah-row .g-en').count() === 7, 'reader: 7 EN gutters');
    ok(await pg.locator('.ayah-row .g-ar').count() === 7, 'reader: 7 AR markers');
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#builder')).display) === 'none', 'reader: builder hidden public');
    ok(await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0, 'reader: no hscroll');
    await pg.click('#hlToggle');
    await pg.click('.ayah-row[data-n="2"]'); await pg.waitForTimeout(100);
    ok(await pg.evaluate(() => document.querySelector('.ayah-row[data-n="2"]').dataset.hl) === 'gold', 'reader: highlight gold');
    ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('ab-hl'))['1']['2']) === 'gold', 'reader: persisted');
    await pg.click('.ayah-row[data-n="2"]');
    ok(await pg.evaluate(() => !document.querySelector('.ayah-row[data-n="2"]').dataset.hl), 'reader: re-tap erases');
    await pg.close();
    const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p2.goto(U('quran/text/index.html?s=1&from=5&to=7&hl=5-6:mint'), { waitUntil: 'networkidle' }); await p2.waitForTimeout(600);
    ok(await p2.evaluate(() => document.querySelector('.ayah-row[data-n="5"]').dataset.hl) === 'mint', 'reader: &hl= pre-highlights');
    await p2.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await pg.addInitScript(() => localStorage.setItem('ab-settings', JSON.stringify({ admin: 'on' })));
    await pg.goto(U('quran/text/index.html?s=1'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#builder')).display) !== 'none', 'reader: builder visible staff');
    await pg.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
    await pg.goto(U('quran/concentration/index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.seg.ab-adminonly')).display) === 'none', 'conc: view tabs hidden public');
    ok(await pg.evaluate(() => document.body.classList.contains('view-electronic')), 'conc: public plain view');
    const optTxt = await pg.evaluate(() => document.querySelector('#pageSelect option').textContent);
    ok(/1 · /.test(optTxt) && !/scan pending/.test(optTxt), 'conc: titled dropdown');
    ok(await pg.evaluate(() => document.getElementById('deckLink').href.includes('practice/deck/?src=cq%3A0')), 'conc: deck link scoped');
    await pg.close();
    const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p2.addInitScript(() => localStorage.setItem('ab-settings', JSON.stringify({ admin: 'on' })));
    await p2.goto(U('quran/concentration/index.html'), { waitUntil: 'networkidle' }); await p2.waitForTimeout(500);
    ok(await p2.evaluate(() => getComputedStyle(document.querySelector('.seg.ab-adminonly')).display) !== 'none', 'conc: staff sees tabs');
    ok(await p2.evaluate(() => document.body.classList.contains('view-both')), 'conc: staff Both view');
    await p2.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(U('practice/deck/index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(900);
    const n = await pg.evaluate(() => document.querySelectorAll('#tabSel option').length);
    ok(n === 3, 'deck: three tabs loaded (' + n + ')');
    await pg.click('.modes button[data-m="flip"]'); await pg.waitForTimeout(250);
    ok(await pg.evaluate(() => document.getElementById('fAr').textContent.length > 0), 'deck: Arabic on card');
    await pg.click('#flipcard'); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => document.getElementById('flipcard').classList.contains('flipped')), 'deck: card flips');
    await pg.click('.modes button[data-m="learn"]'); await pg.waitForTimeout(300);
    ok(await pg.locator('#qOpts button').count() === 4, 'deck: 4 choices');
    await pg.click('#qOpts button[data-ok="1"]'); await pg.waitForTimeout(700);
    ok(await pg.evaluate(() => +document.getElementById('qScore').textContent) === 1, 'deck: scoring works');
    ok(errs.length === 0, 'deck: no JS errors ' + errs.join(';').slice(0, 60));
    await pg.close();
    const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p2.goto(U('arabic/study-deck/index.html?src=cq%3A0'), { waitUntil: 'networkidle' }); await p2.waitForTimeout(900);
    const lbl = await p2.evaluate(() => document.querySelector('#scope option:checked').textContent);
    ok(/^Page 1/.test(lbl), 'deck: ?src= preselects (' + lbl.slice(0, 26) + ')');
    await p2.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
    await pg.goto(U('general/teacher-notes/index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(400);
    ok(await pg.evaluate(() => getComputedStyle(document.getElementById('curateBtn')).display) === 'none', 'notes: curate hidden');
    ok(await pg.evaluate(() => getComputedStyle(document.getElementById('exportZip')).display) === 'none', 'notes: zip hidden');
    await pg.close();
    const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p2.goto(U('general/schedule/index.html'), { waitUntil: 'networkidle' }); await p2.waitForTimeout(600);
    ok(await p2.evaluate(() => { const el = document.getElementById('importBtn'); return !el || getComputedStyle(el).display === 'none'; }), 'schedule: import hidden');
    ok(await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0, 'schedule: no hscroll');
    await p2.close();
    const p3 = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p3.addInitScript(() => localStorage.setItem('ab-settings', JSON.stringify({ admin: 'on' })));
    await p3.goto(U('general/schedule/index.html'), { waitUntil: 'networkidle' }); await p3.waitForTimeout(600);
    ok(await p3.evaluate(() => { const el = document.getElementById('importBtn'); return el && getComputedStyle(el).display !== 'none'; }), 'schedule: staff sees import');
    await p3.close();
  }
  {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await pg.goto(U('general/giving/index.html'), { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    const pops = await pg.evaluate(() => {
      const pop = document.querySelector('.ab-pop');
      return { h4: [...pop.querySelectorAll('h4')].map(x => x.textContent), staff: !!pop.querySelector('.ab-staffbtn') };
    });
    ok(!pops.h4.includes('Theme'), 'gear: Theme row removed');
    ok(pops.staff, 'gear: Staff row present');
    await pg.close();
  }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
