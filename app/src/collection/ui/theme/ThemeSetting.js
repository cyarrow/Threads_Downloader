import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOUCH, icon, space, useCollectionTheme, useThemeChoice } from '../../tokens';

const SEGMENT_HEIGHT = 36;

// Settings row 「主題」 with a segmented control (雜誌 | 底片). Switching applies at
// once and is remembered (store.js keeps it in the meta table). Lives here so the
// settings sheet only needs one line for it.
export function ThemeSettingRow() {
  const t = useCollectionTheme();
  const { id, setTheme, choices } = useThemeChoice();
  return (
    <View style={styles.row}>
      <Ionicons name="color-palette-outline" size={icon.lg} color={t.foreground} />
      <Text nativeID="themeLabel" style={[t.font.body, styles.flex, { color: t.foreground }]}>
        主題
      </Text>
      <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel="主題">
        {choices.map((c, i) => {
          const on = c.id === id;
          const r = t.radius.sm;
          const corners = i === 0 ? { borderTopLeftRadius: r, borderBottomLeftRadius: r } : { borderTopRightRadius: r, borderBottomRightRadius: r };
          return (
            // The touch target is the full 48dp row height; the visible segment is 36.
            <Pressable
              key={c.id}
              onPress={() => !on && setTheme?.(c.id)}
              disabled={!setTheme}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on} // react-native-web reads only the aria-* form
              accessibilityLabel={`主題：${c.name}`}
              style={[styles.target, i > 0 && styles.joined]}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.segment,
                    corners,
                    { borderColor: t.outline },
                    on && { backgroundColor: t.foreground, borderColor: t.foreground },
                    pressed && !on && { backgroundColor: t.muted },
                  ]}
                >
                  {on && <Ionicons name="checkmark" size={icon.sm} color={t.card} />}
                  <Text style={[t.font.label, { color: on ? t.card : t.foreground }]}>{c.name}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm },
  segments: { flexDirection: 'row' },
  target: { minHeight: TOUCH, justifyContent: 'center' },
  joined: { marginLeft: -1 },
  segment: {
    height: SEGMENT_HEIGHT,
    borderWidth: 1,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: space.md,
  },
});
