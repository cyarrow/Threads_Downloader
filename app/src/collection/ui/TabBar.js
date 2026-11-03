import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { icon, space, useCollectionTheme } from '../tokens';

// Visible height above the bottom safe area.
export const TAB_BAR_HEIGHT = 56;

const ITEMS = [
  { key: 'deck', label: '翻翻', icon: 'albums' },
  { key: 'home', label: '收藏', icon: 'grid' },
  { key: 'stream', label: '串流', icon: 'reader' },
];

// Bottom tabs. 雜誌: a hairline on top, icon + label; the active tab is in
// foreground ink with a filled icon and a 2px ink bar along the top edge.
// 底片 (t.rule 'sprocket'): a dark film strip in both schemes, light labels, and a
// small orange (stamp) mark above the active tab's filled icon.
// Either way the active tab is marked by shape as well as colour, and the labels
// come from the bar's own tokens (tabBar / onTabBar / onTabBarMuted, ≥ 4.5:1).
export function TabBar({ tab, onChange }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const film = t.rule === 'sprocket';
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        film ? styles.strip : { borderTopColor: t.border },
        { backgroundColor: t.tabBar, paddingBottom: insets.bottom },
      ]}
    >
      {ITEMS.map((it) => {
        const on = tab === it.key;
        const color = on ? t.onTabBar : t.onTabBarMuted;
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
            {film ? (
              <View style={[styles.mark, { backgroundColor: on ? t.stamp : 'transparent' }]} />
            ) : (
              <View style={[styles.indicator, { backgroundColor: on ? t.onTabBar : 'transparent' }]} />
            )}
            <Ionicons name={on ? it.icon : `${it.icon}-outline`} size={icon.lg} color={color} />
            <Text style={[t.font.caption, on && styles.labelOn, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  strip: { borderTopWidth: 0 },
  item: { flex: 1, minHeight: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: space.xs },
  indicator: { position: 'absolute', top: 0, height: 2, left: '30%', right: '30%' },
  mark: { position: 'absolute', top: 3, width: 12, height: 4, borderRadius: 2 },
  labelOn: { fontWeight: '600' },
});
