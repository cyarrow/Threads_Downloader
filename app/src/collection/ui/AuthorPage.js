import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { summaryText } from '../authorModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';

// Header area of an author's page (rendered by the wall above that author's
// cards, like TagPageBar on a tag page): 「N 篇 · 最常用標籤：追星、生活」 and
// 「用串流看 ›」. The page's title is the @handle; 選取 is in the title row.
export function AuthorBar({ handle, summary, onStream }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.row}>
      <Text style={[t.font.meta, styles.flex, { color: t.mutedForeground }]} accessibilityLiveRegion="polite">
        {summaryText(summary)}
      </Text>
      {summary.count > 0 && (
        <Pressable
          onPress={onStream}
          accessibilityRole="button"
          accessibilityLabel={`用串流看 @${handle}`}
          style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[t.font.label, { color: t.accent }]}>用串流看</Text>
          <Ionicons name="chevron-forward" size={icon.sm} color={t.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginRight: -space.sm, minHeight: TOUCH },
  textButton: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: space.sm },
});
