# Fonts

`WenKaiTC-Regular.ttf` / `WenKaiTC-Bold.ttf` are subsets of **LXGW WenKai TC**
(https://github.com/lxgw/LxgwWenkaiTC, via google/fonts), licensed under the
SIL Open Font License 1.1 (see `OFL.txt`).

Subset to ASCII/Latin-1, common punctuation and symbols, and Big5 level-1
characters (6,929 code points) with fontTools `pyftsubset`, to keep the APK
small (~4 MB per weight instead of ~13 MB). Characters outside the subset fall
back to the system font.

`ImprintMono-Regular.ttf` (3.7 KB) is the 底片 theme's date imprint (`'26 11  2`):
a subset of **IBM Plex Mono Medium** 2.3 (https://github.com/IBM/plex, via
google/fonts), SIL Open Font License 1.1 (see `OFL-ImprintMono.txt`). Only
`0-9 ' space . , : / - ·` are kept. Plex has the Reserved Font Name "Plex" and a
subset is a Modified Version under the OFL, so the family is renamed
`ImprintMono` (name IDs 1/3/4/6 rewritten; copyright, trademark and licence
entries kept). Rebuild with `make_imprint_font.py <IBMPlexMono-Medium.ttf> <out.ttf>`
(fontTools; no hinting, `kern` only, DSIG dropped).
