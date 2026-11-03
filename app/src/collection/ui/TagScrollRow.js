import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UNCATEGORIZED } from '../tagModel';
import { TOUCH, space, useCollectionTheme } from '../tokens';
import { TagChip } from './base';

// One horizontally scrolling row of tag chips: 全部, every 大標籤, 未分類, then an
// optional trailing chip (「所有標籤 ›」 on the wall). Used by 收藏, 翻翻 and 串流.
// `selected`: array of tag ids (UNCATEGORIZED for 未分類); empty = 全部.
// `multi`: the wall keeps its union filter (several 大標籤 at once); the deck and
// the stream pick one at a time. `bleed`: how far the row extends past its
// parent's padding so chips scroll in from the screen edge.
// `resultCount`: shows 「N 篇 · 清除篩選」 under the row while filtering.
export function TagScrollRow({ index, selected, onChange, multi, trailing, bleed = 0, resultCount, label = '標籤篩選' }) {
  const t = useCollectionTheme();
  const toggle = (id) => {
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (!multi) return onChange([id]);
    // A 大標籤 replaces any of its own 小標籤 (from a tag page) and vice versa.
    const tag = index.byId[id];
    const family = tag ? (index.children[id] || []).map((c) => c.id) : [];
    return onChange([...selected.filter((x) => !family.includes(x)), id]);
  };
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={label}
        style={{ marginHorizontal: -bleed }}
        contentContainerStyle={[styles.row, { paddingHorizontal: bleed }]}
      >
        <TagChip neutral label="全部" selected={selected.length === 0} onPress={() => onChange([])} />
        {index.parents.map((p) => (
          <TagChip key={p.id} hue={p.color} label={p.name} selected={selected.includes(p.id)} onPress={() => toggle(p.id)} />
        ))}
        <TagChip hue="slate" label="未分類" selected={selected.includes(UNCATEGORIZED)} onPress={() => toggle(UNCATEGORIZED)} />
        {trailing}
      </ScrollView>
      {resultCount !== undefined && selected.length > 0 && (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text style={[t.font.meta, { color: t.mutedForeground }]}>{resultCount} 篇</Text>
          <Text style={[t.font.meta, { color: t.mutedForeground }]}>·</Text>
          <Pressable onPress={() => onChange([])} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.clear}>
            <Text style={[t.font.meta, { color: t.accent }]}>清除篩選</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  // Vertical padding keeps the chips' 48dp touch area inside the scroll view.
  row: { gap: space.sm, alignItems: 'center', paddingVertical: (TOUCH - 36) / 2 },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  clear: { minHeight: 32, justifyContent: 'center' },
});
