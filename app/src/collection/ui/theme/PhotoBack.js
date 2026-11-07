import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatImprint } from '../../themes';
import { useCollectionTheme } from '../../tokens';

const RULE = StyleSheet.hairlineWidth * 2;

// Ruled lines under the text, one per line of `lineHeight`, so the words sit on them.
function Rules({ lineHeight, color, height }) {
  const count = Math.floor(height / lineHeight);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.rule, { top: (i + 1) * lineHeight - RULE, backgroundColor: color }]} />
      ))}
    </View>
  );
}

// A text-only post as a card, in the current theme. Paper and text colours come
// from one set (t.tag(hue)), so the words always match the surface they're on.
//   雜誌 ('tint'):  tag-tinted page opening with a large 「 in the tag colour.
//   底片 ('lined'): the back of a photo — ruled off-white (darkroom: dark) paper,
//                   the post in WenKai on the rules, and a small date line
//                   ('26 11  2 · @author) at the bottom.
// `textStyle` picks the type (default t.font.quote); `numberOfLines` truncates;
// `selectable` and `large` (wider margins, bigger 「) for the detail page.
// `note` (底片 only): the user's note, written in pencil above the date line.
export function PhotoBack({ hue, text, savedAt, author, textStyle, numberOfLines, selectable, large, note, style }) {
  const t = useCollectionTheme();
  const s = t.tag(hue || 'slate');
  const type = textStyle || t.font.quote;
  const [height, setHeight] = useState(0);

  if (t.textCard !== 'lined') {
    return (
      <View style={[styles.page, large && styles.pageLarge, { backgroundColor: s.paper, borderRadius: t.radius.xs }, style]}>
        <Text style={[t.font.quote, large ? styles.markLarge : styles.mark, { color: s.mark }]} importantForAccessibility="no" accessibilityElementsHidden>
          「
        </Text>
        <Text style={[type, { color: s.onPaper }]} numberOfLines={numberOfLines} selectable={selectable}>
          {text}
        </Text>
      </View>
    );
  }

  const date = formatImprint(savedAt);
  return (
    <View style={[styles.back, large && styles.backLarge, { backgroundColor: s.paper, borderRadius: t.radius.xs }, style]}>
      <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        {!!s.paperRule && height > 0 && <Rules lineHeight={type.lineHeight} color={s.paperRule} height={height} />}
        <Text style={[type, { color: s.onPaper }]} numberOfLines={numberOfLines} selectable={selectable}>
          {text}
        </Text>
      </View>
      {!!note && (
        <View style={styles.note} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="pencil" size={11} color={s.onPaperMuted} />
          <Text style={[t.font.hand, styles.noteText, { color: s.onPaperMuted }]} numberOfLines={1}>
            {note}
          </Text>
        </View>
      )}
      {(!!date || !!author) && (
        <View style={styles.dateline}>
          {!!date && <Text style={[t.font.imprint, { color: s.onPaperMuted }]} maxFontSizeMultiplier={1.3}>{date.trim()}{author ? ' ·' : ''}</Text>}
          {!!author && (
            <Text style={[t.font.caption, styles.author, { color: s.onPaperMuted }]} numberOfLines={1}>
              @{author}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingBottom: 12 },
  pageLarge: { paddingHorizontal: 16, paddingBottom: 16 },
  mark: { fontSize: 40, lineHeight: 48, marginLeft: -14, marginBottom: -10 },
  markLarge: { fontSize: 44, lineHeight: 52, marginLeft: -16, marginBottom: -12 },
  back: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.16)',
  },
  backLarge: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  rule: { position: 'absolute', left: 0, right: 0, height: RULE },
  // Date first; a long @author moves to its own line rather than cutting the date.
  dateline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 4 },
  author: { flexShrink: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteText: { flexShrink: 1 },
});
