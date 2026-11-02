import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, icon, space, useCollectionTheme } from '../tokens';

// Visible height above the bottom safe area.
export const TAB_BAR_HEIGHT = 56;

const ITEMS = [
  { key: 'deck', label: '翻翻', icon: 'albums' },
  { key: 'home', label: '收藏', icon: 'grid' },
  { key: 'stream', label: '串流', icon: 'reader' },
];

// Bottom tabs (雜誌): a hairline on top, icon + label. The active tab is in
// foreground ink with a filled icon and a 2px ink bar along the top edge, so it
// is marked by shape as well as colour; the others are mutedForeground
// (≥ 4.5:1 on background in both schemes).
export function TabBar({ tab, onChange }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { borderTopColor: t.border, backgroundColor: t.background, paddingBottom: insets.bottom }]}
    >
      {ITEMS.map((it) => {
        const on = tab === it.key;
        const color = on ? t.foreground : t.mutedForeground;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={it.label}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.indicator, { backgroundColor: on ? t.foreground : 'transparent' }]} />
            <Ionicons name={on ? it.icon : `${it.icon}-outline`} size={icon.lg} color={color} />
            <Text style={[font.caption, on && styles.labelOn, { color }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  item: { flex: 1, minHeight: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: space.xs },
  indicator: { position: 'absolute', top: 0, height: 2, left: '30%', right: '30%' },
  labelOn: { fontWeight: '600' },
});
