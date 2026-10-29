# Fonts

`WenKaiTC-Regular.ttf` / `WenKaiTC-Bold.ttf` are subsets of **LXGW WenKai TC**
(https://github.com/lxgw/LxgwWenkaiTC, via google/fonts), licensed under the
SIL Open Font License 1.1 (see `OFL.txt`).

Subset to ASCII/Latin-1, common punctuation and symbols, and Big5 level-1
characters (6,929 code points) with fontTools `pyftsubset`, to keep the APK
small (~4 MB per weight instead of ~13 MB). Characters outside the subset fall
back to the system font.
