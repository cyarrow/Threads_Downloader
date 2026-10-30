# Contrast check for the Threads Collection tokens in MASTER.md.
# Run: python3 design-system/threads-collection/contrast_check.py  (exits listing FAILS: 0 when all pairs pass)

def hx(c): c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
def over(rgba, bg):
    (r, g, b), a = hx(rgba[0]), rgba[1]; br, bg_, bb = hx(bg)
    return '#%02X%02X%02X' % (round(r*a + br*(1-a)), round(g*a + bg_*(1-a)), round(b*a + bb*(1-a)))
def lum(c):
    def ch(v): v /= 255; return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    r, g, b = map(ch, hx(c)); return 0.2126*r + 0.7152*g + 0.0722*b
def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x+0.05)/(y+0.05)
fails = 0
def check(name, fg, bg, need=4.5):
    global fails
    r = cr(fg, bg); ok = r >= need; fails += not ok
    print(f"{'PASS' if ok else 'FAIL'} {r:5.2f} (≥{need})  {name}: {fg} on {bg}")

# 雜誌 direction (2026-10-30). Keep in sync with app/src/collection/tokens.js.
L = dict(bg='#F7F6F2', card='#FFFFFF', muted='#ECEAE4', fg='#1E1D1A', mutedFg='#5E5B53', border='#D9D6CE',
         primary='#1E1D1A', onPrimary='#F7F6F2', accent='#2E4E8F', danger='#B3261E', success='#2F7D4A', field='#ECEAE4')
D = dict(bg='#161615', card='#1F1F1D', muted='#2A2A27', fg='#EDEBE6', mutedFg='#A9A69E', border='#36352F',
         primary='#EDEBE6', onPrimary='#161615', accent='#9DB7EA', danger='#F2978F', success='#7CC793', field='#2A2A27')
for mode, t in (('LIGHT', L), ('DARK', D)):
    print(f'--- {mode}')
    for s in ('bg', 'card', 'muted', 'field'):
        check(f'fg on {s}', t['fg'], t[s]); check(f'mutedFg on {s}', t['mutedFg'], t[s])
    for s in ('bg', 'card'):
        check(f'accent text on {s}', t['accent'], t[s]); check(f'danger text on {s}', t['danger'], t[s])
    check('onPrimary on primary (FAB/buttons)', t['onPrimary'], t['primary'])
    check('success icon on card (non-text)', t['success'], t['card'], 3)
    check('primary as icon/indicator on card (non-text)', t['primary'], t['card'], 3)
    check('border vs bg (card edge, decorative)', t['border'], t['bg'], 1.2)
    check('primary (FAB) vs bg (non-text)', t['primary'], t['bg'], 3)
    check('selected chip (bg on fg)', t['bg'], t['fg'])
    check('accent (精選 kicker) on bg', t['accent'], t['bg'])

TAGS = {  # name: (light bg, light text, dark text, dot) — mirrors app/src/collection/palette.js
  'rose':    ('#F3E1E1', '#943040', '#EDA3AC', '#C4485C'),
  'orange':  ('#F3E4D6', '#8A4215', '#EBB083', '#C9692B'),
  'green':   ('#E2EADB', '#3F5E2A', '#B0CC92', '#6B8E47'),
  'teal':    ('#DCEAE6', '#285E57', '#8DCBBE', '#3F8C80'),
  'sky':     ('#DEE6EF', '#2A5780', '#9BBFE2', '#4C82B4'),
  'indigo':  ('#E1E2EF', '#3A4589', '#AEB5E8', '#5864B4'),
  'violet':  ('#E8E0EE', '#5E3D82', '#C8B1E3', '#8763AF'),
  'pink':    ('#F2E0E8', '#8A3157', '#EBA7C5', '#B9527F'),
  'slate':   ('#E6E4DF', '#4F4C46', '#C6C2BA', '#827D74'),
}
print('--- TAGS')
for n, (lbg, ltx, dtx, dot) in TAGS.items():
    dbg = over((dot, 0.20), D['card'])
    check(f'{n} chip light', ltx, lbg); check(f'{n} chip light on card', ltx, L['card'])
    check(f'{n} selected light (white on text color)', '#FFFFFF', ltx)
    check(f'{n} chip dark (tint {dbg})', dtx, dbg); check(f'{n} chip dark text on card', dtx, D['card'])
    check(f'{n} selected dark (black on dark text color)', '#000000', dtx)
    check(f'{n} kicker light on page bg', ltx, L['bg']); check(f'{n} kicker dark on page bg', dtx, D['bg'])
    check(f'{n} quote text light on tint', L['fg'], lbg); check(f'{n} quote text dark on tint', D['fg'], dbg)
print('FAILS:', fails)
