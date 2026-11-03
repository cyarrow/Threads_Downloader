# Contrast check for every theme × light/dark in app/src/collection/themes.js.
# Run: python3 design-system/threads-collection/contrast_check_themes.py   (needs node)
# Reads the registry straight from themes.js (no copied hex values), and checks each
# text colour against every surface it is drawn on. Exits non-zero on any FAIL.
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THEMES_JS = os.path.join(ROOT, 'app', 'src', 'collection', 'themes.js')
DUMP = """
const m = await import(process.argv[1]);
const p = await import(new URL('./palette.js', process.argv[1]).href);
const out = {};
for (const id of m.THEME_IDS) {
  out[id] = { name: m.THEMES[id].name, schemes: {} };
  for (const s of ['light', 'dark']) {
    const tags = {};
    for (const h of p.TAG_HUES) tags[h] = m.tagStyle(id, s, h);
    out[id].schemes[s] = { colors: m.THEMES[id].colors[s], tags };
  }
}
console.log(JSON.stringify(out));
"""
data = json.loads(subprocess.check_output(
    ['node', '--no-warnings', '--input-type=module', '-e', DUMP, 'file://' + THEMES_JS], cwd=ROOT))

def hx(c):
    c = c.strip()
    if c.startswith('rgba'):
        r, g, b, a = [float(x) for x in c[c.index('(') + 1:-1].split(',')]
        return (r, g, b), a
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4)), 1.0
def over(fg, bg):
    (r, g, b), a = hx(fg); (br, bgg, bb), _ = hx(bg)
    return '#%02X%02X%02X' % (round(r*a + br*(1-a)), round(g*a + bgg*(1-a)), round(b*a + bb*(1-a)))
def lum(c):
    def ch(v): v /= 255; return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    (r, g, b), _ = hx(c); r, g, b = map(ch, (r, g, b)); return 0.2126*r + 0.7152*g + 0.0722*b
def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x+0.05)/(y+0.05)

fails = 0; total = 0
def check(name, fg, bg, need=4.5):
    global fails, total
    r = cr(fg, bg); ok = r >= need; fails += not ok; total += 1
    if not ok or '-v' in sys.argv:
        print(f"{'PASS' if ok else 'FAIL'} {r:5.2f} (≥{need})  {name}: {fg} on {bg}")

for tid, theme in data.items():
    for scheme, d in theme['schemes'].items():
        t = d['colors']; label = f"{theme['name']} {tid} {scheme}"
        print(f'--- {label}')
        # Text on the surfaces it appears on.
        for s in ('background', 'card', 'muted', 'field'):
            check(f'foreground on {s}', t['foreground'], t[s]); check(f'mutedForeground on {s}', t['mutedForeground'], t[s])
        for s in ('background', 'card'):
            check(f'accent text on {s}', t['accent'], t[s]); check(f'danger text on {s}', t['danger'], t[s])
        check('onPrimary on primary (buttons, FAB)', t['onPrimary'], t['primary'])
        check('background on foreground (selected chip, toast, pressed row)', t['background'], t['foreground'])
        check('card on foreground (selected segment on a sheet)', t['card'], t['foreground'])
        for s in ('paper',):
            check(f'onPaper on {s} (text card)', t['onPaper'], t[s]); check(f'onPaperMuted on {s} (date line)', t['onPaperMuted'], t[s])
        check('onEdge on edge (text on a print border)', t['onEdge'], t['edge'])
        check('onEdgeMuted on edge', t['onEdgeMuted'], t['edge'])
        check('onTabBar on tabBar (active tab label)', t['onTabBar'], t['tabBar'])
        check('onTabBarMuted on tabBar (tab labels)', t['onTabBarMuted'], t['tabBar'])
        for photo in ('#FFFFFF', '#808080', '#000000'):
            check(f'onBadge on badge over a {photo} photo (▶ 影片 / N 張)', t['onBadge'], over(t['badge'], photo))
        # Non-text (3:1).
        check('success icon on card', t['success'], t['card'], 3)
        check('primary (FAB, filled button) vs background', t['primary'], t['background'], 3)
        check('primary as indicator on card', t['primary'], t['card'], 3)
        check('outline (control edge) vs background', t['outline'], t['background'], 3)
        check('outline (control edge) vs card', t['outline'], t['card'], 3)
        check('switch off track (mutedForeground) vs card', t['mutedForeground'], t['card'], 3)
        check('danger icon on card', t['danger'], t['card'], 3)
        if tid != 'editorial':
            check('stamp as active-tab mark on tabBar', t['stamp'], t['tabBar'], 3)
        check('onTabBarMuted icon on tabBar', t['onTabBarMuted'], t['tabBar'], 3)
        # Decorative: must be visible, no 3:1 requirement.
        check('border vs background (hairline)', t['border'], t['background'], 1.2)
        check('sprocket strip vs background', t['sprocket'], t['background'], 1.4)
        check('sprocket holes vs strip', t['sprocketHole'], t['sprocket'], 1.4)
        check('paper rule vs paper', t['paperRule'], t['paper'], 1.1)
        if tid != 'editorial':
            check('print edge vs background (plus shadow)', t['edge'], t['background'], 1.15)
        # Tags: each hue's name on page and card, and the text on its paper.
        for h, s in d['tags'].items():
            for surf in ('background', 'card'):
                check(f'tag {h} name (kicker) on {surf}', s['text'], t[surf])
            check(f'tag {h} text card: onPaper on paper {s["paper"]}', s['onPaper'], s['paper'])
            check(f'tag {h} text card: onPaperMuted on paper {s["paper"]}', s['onPaperMuted'], s['paper'])
            if s['paperRule']:
                check(f'tag {h} paper rule vs paper', s['paperRule'], s['paper'], 1.1)

print(f'CHECKS: {total}  FAILS: {fails}')
sys.exit(1 if fails else 0)
