import { StyleSheet, Text, View } from 'react-native';
import { useCollectionTheme } from '../../tokens';

// A tag's colour marker, drawn the way the current theme does it: a small square
// (雜誌) or a thin vertical bar (底片). Colour is never the only signal — it always
// sits next to the tag's name.
// size: 'xs' (小標籤 rows) | 'sm' (kickers) | 'md' (chips) | 'lg' (big tag rows).
const SQUARE = {
  xs: { width: 6, height: 6, borderRadius: 1 },
  sm: { width: 8, height: 8, borderRadius: 1 },
  md: { width: 8, height: 8, borderRadius: 1 },
  lg: { width: 12, height: 12, borderRadius: 1 },
};
const BAR = {
  xs: { width: 2, height: 10 },
  sm: { width: 3, height: 12 },
  md: { width: 3, height: 16 },
  lg: { width: 4, height: 18 },
};

export function TagMark({ hue, color, size = 'sm', style }) {
  const t = useCollectionTheme();
  const dims = (t.marker === 'bar' ? BAR : SQUARE)[size] || SQUARE.sm;
  return <View style={[dims, { backgroundColor: color || t.tag(hue || 'slate').mark }, style]} />;
}

// Section label above a post: [精選] ▌ 大標籤 › 小標籤 +N. The name takes the tag's
// colour in 雜誌 and mutedForeground in 底片 (t.tag(hue).text decides), or
// mutedForeground when the post has no tag.
export function TagKicker({ hue, label, featured, untagged, style }) {
  const t = useCollectionTheme();
  const tag = t.tag(hue || 'slate');
  return (
    <View style={[styles.row, style]}>
      {featured && <Text style={[t.font.kicker, { color: t.accent }]}>精選</Text>}
      <TagMark hue={hue} size="sm" />
      <Text style={[t.font.kicker, styles.flex, { color: untagged ? t.mutedForeground : tag.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
