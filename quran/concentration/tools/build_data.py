"""Build quran/concentration/data.json from the source workbook.

Usage:
    python3 build_data.py quran_vocabulary_pages_1-14.xlsx

Reads the workbook's three sheets:
  - "Vocabulary Index"  -> pages[].themes[].entries (en, tag, ar, status)
  - "Corrections Needed" -> applied in place where a "Should Be" value is given;
                            rows without one mark the entry status "placeholder"
  - "Category Colors"    -> ordering sanity check only (order comes from Page Index)

The existing data.json is the layout contract: note, book (title, subtitle,
abbreviations, scan refs) and per-page scan/thumb references are PRESERVED.
Only the pages' themes/entries/meta are regenerated from the workbook.
The workbook is the source of truth for words; this file is generated.

Requires: openpyxl (pip install openpyxl). Fails loudly on any shape surprise.
"""
import json
import re
import sys

import openpyxl

XLSX = sys.argv[1] if len(sys.argv) > 1 else 'source/quran_vocabulary_pages_1-14.xlsx'
DATA = sys.argv[2] if len(sys.argv) > 2 else 'data.json'

existing = json.load(open(DATA, encoding='utf-8'))
abbrevs = {a[0] for a in existing['book']['abbreviations']}
# compound tags seen in the book ("for br. pl", "mg/fg") are also legal
TAG_RE = re.compile(r'\s*\(([^()]{1,24})\)\s*$')


def split_tag(en):
    """'this (mg)' -> ('this', 'mg'); unknown parentheticals stay in en."""
    m = TAG_RE.search(en)
    if not m:
        return en.strip(), ''
    inner = m.group(1).strip()
    parts = [p.strip() for p in re.split(r'[/,]', inner.replace('for ', ''))]
    known = all(p in abbrevs for p in parts if p)
    if known or inner.startswith('for '):
        return en[:m.start()].strip(), inner
    return en.strip(), ''


wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb['Vocabulary Index']
rows = []
header_seen = False
for r in ws.iter_rows(values_only=True):
    if not header_seen:
        if r[0] == 'Incremental Index (absolute order)' or (
                r[1] == 'Arabic Word' and r[3] == 'Category'):
            header_seen = True
        continue
    if r[0] is None:
        continue
    rows.append({
        'idx': int(r[0]), 'ar': str(r[1]).strip(), 'en_raw': str(r[2]).strip(),
        'cat': str(r[3]).strip(), 'page': int(r[4]), 'pidx': int(r[5]),
        'pct': float(r[6]) if r[6] not in (None, '') else None,
    })
if not header_seen or not rows:
    raise SystemExit('FATAL: Vocabulary Index header or data rows not found')
print(f'workbook: {len(rows)} words, pages '
      f'{min(x["page"] for x in rows)}-{max(x["page"] for x in rows)}')

# --- corrections ---------------------------------------------------------
fixed, flagged = 0, 0
if 'Corrections Needed' in wb.sheetnames:
    cw = wb['Corrections Needed']
    crows, hdr = [], False
    for r in cw.iter_rows(values_only=True):
        if not hdr:
            if r[0] == 'Index':
                hdr = True
            continue
        if r[0] is None:
            continue
        crows.append(r)
    by_key = {(x['page'], x['pidx']): x for x in rows}
    for idx, page, pidx, field, _cur, should, severity, note in (
            (list(r) + [None] * 8)[:8] for r in crows):
        sev = str(severity or '').strip()
        should_s = str(should or '').strip()
        if sev in ('No action', 'Optional') or should_s in ('', '(keep)'):
            continue  # stylistic or explicitly kept — sheet form stands
        try:
            key = (int(page), int(pidx))
        except (TypeError, ValueError):
            print(f'  ! correction row {idx}: range/odd locator '
                  f'({page}, {pidx}) — skipped')
            continue
        tgt = by_key.get(key)
        if tgt is None:
            print(f'  ! correction row {idx}: no entry at page {page} '
                  f'index {pidx} — skipped')
            continue
        f = str(field or '')
        if f.startswith('Arabic Word + English') and '|' in should_s:
            ar_v, en_v = (s.strip() for s in should_s.split('|', 1))
            tgt['ar'], tgt['en_raw'] = ar_v, en_v
            fixed += 1
        elif f.startswith('Arabic Word'):
            tgt['ar'] = should_s
            fixed += 1
        elif f.startswith('English'):
            tgt['en_raw'] = should_s
            fixed += 1
        else:
            tgt['flag'] = True
            flagged += 1
print(f'corrections: {fixed} applied, {flagged} marked placeholder '
      f'(unresolved audit rows)')

# --- rebuild pages -------------------------------------------------------
old_pages = {p['label']: p for p in existing['pages']}
pages = []
pct_by_page = {}
for x in rows:
    pct_by_page.setdefault(x['page'], x['pct'])
for pg in sorted({x['page'] for x in rows}):
    prows = sorted((x for x in rows if x['page'] == pg),
                   key=lambda x: x['pidx'])
    themes, seen = [], {}
    for x in prows:
        if x['cat'] not in seen:
            seen[x['cat']] = {'title': x['cat'], 'entries': []}
            themes.append(seen[x['cat']])
        en, tag = split_tag(x['en_raw'])
        seen[x['cat']]['entries'].append({
            'en': en, 'tag': tag, 'ar': x['ar'],
            'status': 'placeholder' if x.get('flag') else 'ok',
        })
    label = f'Page {pg}'
    old = old_pages.get(label, {})
    pct = pct_by_page.get(pg)
    meta = (f'Cumulative Quran coverage through this block: '
            f'{pct * 100:.1f}%' if pct else '')
    if old.get('meta') and 'Words' in old['meta']:
        meta = old['meta']            # keep the richer hand-written meta
    pages.append({
        'id': f'p{pg:03d}', 'label': label,
        'scan': old.get('scan'), 'thumb': old.get('thumb'),
        'meta': meta, 'themes': themes,
    })

existing['pages'] = pages
json.dump(existing, open(DATA, 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
n = sum(len(t['entries']) for p in pages for t in p['themes'])
print(f'data.json: {len(pages)} pages, '
      f'{sum(len(p["themes"]) for p in pages)} themes, {n} entries')
