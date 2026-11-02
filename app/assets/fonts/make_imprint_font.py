import sys
from fontTools import subset
from fontTools.ttLib import TTFont

src, out = sys.argv[1], sys.argv[2]
chars = "0123456789' .,:/-·"
opts = subset.Options()
opts.layout_features = ['kern']
opts.name_IDs = ['*']
opts.name_languages = ['*']
opts.drop_tables += ['DSIG']
opts.hinting = False
f = TTFont(src)
s = subset.Subsetter(opts)
s.populate(unicodes=[ord(c) for c in chars])
s.subset(f)
# OFL Reserved Font Name "Plex": a subset is a Modified Version, so it gets its own name.
NEW = {1: 'ImprintMono', 2: 'Regular', 3: 'ImprintMono-Regular;digit subset of IBM Plex Mono Medium 2.3',
       4: 'ImprintMono', 6: 'ImprintMono'}
name = f['name']
for nid in (16, 17, 18, 21, 22, 25):
    name.removeNames(nameID=nid)
for nid, val in NEW.items():
    name.removeNames(nameID=nid)
    name.setName(val, nid, 3, 1, 0x409)
    name.setName(val, nid, 1, 0, 0)
name.removeNames(nameID=10)
name.setName('Modified Version (digit subset, renamed) of IBM Plex Mono Medium, (c) 2017 IBM Corp., SIL OFL 1.1.', 10, 3, 1, 0x409)
f['OS/2'].usWeightClass = 400
f['OS/2'].fsSelection = (f['OS/2'].fsSelection & ~0b1100001) | 0b1000000
f['head'].macStyle = 0
f.save(out)
g = TTFont(out)
print(sorted(chr(c) for c in g.getBestCmap()))
print([(r.nameID, r.toUnicode()) for r in g['name'].names if r.platformID == 3])
