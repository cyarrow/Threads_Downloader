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

L = dict(bg='#FFFBEB', card='#FFFFFF', muted='#FCF6F0', fg='#0F172A', mutedFg='#475569', border='#E7DCCB',
         primary='#D97706', onPrimary='#000000', accent='#2563EB', danger='#DC2626', success='#15803D', field='#F5EFE6')
D = dict(bg='#12100E', card='#1E1B18', muted='#2A2622', fg='#F5F1EA', mutedFg='#B8B0A6', border='#3A352F',
         primary='#F59E0B', onPrimary='#000000', accent='#60A5FA', danger='#F87171', success='#4ADE80', field='#2A2622')
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

TAGS = {  # name: (light bg, light text, dark text, dot)
  'rose':    ('#FFE4E6', '#9F1239', '#FDA4AF', '#F43F5E'),
  'orange':  ('#FFEDD5', '#9A3412', '#FDBA74', '#F97316'),
  'green':   ('#DCFCE7', '#166534', '#86EFAC', '#22C55E'),
  'teal':    ('#CCFBF1', '#115E59', '#5EEAD4', '#14B8A6'),
  'sky':     ('#E0F2FE', '#075985', '#7DD3FC', '#0EA5E9'),
  'indigo':  ('#E0E7FF', '#3730A3', '#A5B4FC', '#6366F1'),
  'violet':  ('#F3E8FF', '#6B21A8', '#D8B4FE', '#A855F7'),
  'pink':    ('#FCE7F3', '#9D174D', '#F9A8D4', '#EC4899'),
  'slate':   ('#F1F5F9', '#334155', '#CBD5E1', '#64748B'),
}
print('--- TAGS')
for n, (lbg, ltx, dtx, dot) in TAGS.items():
    dbg = over((dot, 0.20), D['card'])
    check(f'{n} chip light', ltx, lbg); check(f'{n} chip light on card', ltx, L['card'])
    check(f'{n} selected light (white on text color)', '#FFFFFF', ltx)
    check(f'{n} chip dark (tint {dbg})', dtx, dbg); check(f'{n} chip dark text on card', dtx, D['card'])
    check(f'{n} selected dark (black on dark text color)', '#000000', dtx)
print('FAILS:', fails)
