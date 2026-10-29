import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UNCATEGORIZED, foldChips } from '../tagModel';
import { font, space, useCollectionTheme } from '../tokens';
import { TagChip } from './base';

const MAX_PARENTS = 5;

// Wall filter: parent tags wrap (overflow folds into "+N"), and the children of
// any selected parent appear on a second row to narrow the filter down.
// Picking a child replaces its parent; picking a parent replaces its children.
export function TagFilterBar({ index, selected, onChange, resultCount }) {
  const t = useCollectionTheme();
  const [expanded, setExpanded] = useState(false);

  const toggle = (tag) => {
    if (selected.includes(tag.id)) return onChange(selected.filter((id) => id !== tag.id));
    const family = tag.parentId
      ? [tag.parentId]
      : (index.children[tag.id] || []).map((c) => c.id);
    onChange([...selected.filter((id) => !family.includes(id)), tag.id]);
  };

  const { visible, hidden } = foldChips(index.parents, selected, MAX_PARENTS, expanded);
  const openParents = index.parents.filter(
    (p) => selected.includes(p.id) || (index.children[p.id] || []).some((c) => selected.includes(c.id)),
  );
  const childRow = openParents.flatMap((p) => index.children[p.id] || []);

  return (
    <View style={styles.wrap}>
      <View style={styles.row} accessibilityLabel="標籤篩選">
        <TagChip neutral label="全部" selected={selected.length === 0} onPress={() => onChange([])} />
        {visible.map((p) => (
          <TagChip key={p.id} hue={p.color} label={p.name} selected={selected.includes(p.id)} onPress={() => toggle(p)} />
        ))}
        {hidden > 0 && (
          <TagChip
            neutral
            label={`+${hidden}`}
            a11yLabel={`顯示另外 ${hidden} 個標籤`}
            expanded={false}
            onPress={() => setExpanded(true)}
          />
        )}
        <TagChip
          hue="slate"
          label="未分類"
          selected={selected.includes(UNCATEGORIZED)}
          onPress={() =>
            onChange(
              selected.includes(UNCATEGORIZED)
                ? selected.filter((id) => id !== UNCATEGORIZED)
                : [...selected, UNCATEGORIZED],
            )
          }
        />
      </View>
      {childRow.length > 0 && (
        <View style={[styles.row, styles.childRow, { borderLeftColor: t.border }]}>
          {childRow.map((c) => (
            <TagChip
              key={c.id}
              hue={index.byId[c.parentId].color}
              label={c.name}
              selected={selected.includes(c.id)}
              onPress={() => toggle(c)}
            />
          ))}
        </View>
      )}
      {selected.length > 0 && (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text style={[font.meta, { color: t.mutedForeground }]}>{resultCount} 篇</Text>
          <Text style={[font.meta, { color: t.mutedForeground }]}>·</Text>
          <Pressable
            onPress={() => onChange([])}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clear}
          >
            <Text style={[font.meta, { color: t.accent }]}>清除篩選</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  childRow: { borderLeftWidth: 2, paddingLeft: space.sm, marginLeft: space.xs },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  clear: { minHeight: 32, justifyContent: 'center' },
});
