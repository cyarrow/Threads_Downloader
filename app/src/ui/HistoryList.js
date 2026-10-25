import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { summary, timeAgo } from '../historyModel';
import { Card } from './components';
import { type, useTheme } from './theme';

// "最近下載": tap a row to open the post in Threads, or the arrow to save it again.
export function HistoryList({ items, onRedownload, onClear, disabled }) {
  const t = useTheme();
  if (!items.length) return null;

  const confirmClear = () =>
    Alert.alert('清除下載紀錄？', '只會清除這份清單，相簿裡的檔案不受影響。', [
      { text: '取消', style: 'cancel' },
      { text: '清除', style: 'destructive', onPress: onClear },
    ]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={[type.footnote, styles.sectionTitle, { color: t.secondary }]}>最近下載</Text>
        <Pressable onPress={confirmClear} hitSlop={10} accessibilityRole="button">
          <Text style={[type.footnote, { color: t.accent }]}>清除</Text>
        </Pressable>
      </View>
      <Card style={styles.card}>
        {items.map((item, i) => (
          <Pressable
            key={item.code}
            onPress={() => Linking.openURL(item.url)}
            accessibilityRole="link"
            accessibilityHint="在 Threads 開啟這篇貼文"
          >
            {({ pressed }) => (
              <View style={[styles.row, pressed && { backgroundColor: t.fill }]}>
                {item.thumb ? (
                  <Image source={{ uri: item.thumb }} style={[styles.thumb, { backgroundColor: t.fill }]} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: t.fill }]} />
                )}
                <View
                  style={[
                    styles.text,
                    i < items.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: t.separator,
                    },
                  ]}
                >
                  <View style={styles.textCol}>
                    <Text style={[type.headline, { color: t.label }]} numberOfLines={1}>
                      {item.author ? `@${item.author}` : 'Threads 貼文'}
                    </Text>
                    {!!item.caption && (
                      <Text style={[type.subhead, { color: t.secondary }]} numberOfLines={1}>
                        {item.caption}
                      </Text>
                    )}
                    <Text style={[type.footnote, { color: t.tertiary }]}>
                      {summary(item)} · {timeAgo(item.savedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onRedownload(item.url)}
                    disabled={disabled}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="重新下載"
                    style={({ pressed: p }) => [
                      styles.redownload,
                      { backgroundColor: t.fill, opacity: disabled ? 0.4 : p ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.redownloadGlyph, { color: t.accent }]}>↓</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: { textTransform: 'uppercase' },
  card: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  thumb: { width: 52, height: 52, borderRadius: 8, marginVertical: 10 },
  text: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12, paddingRight: 16, alignSelf: 'stretch' },
  textCol: { flex: 1, gap: 1, paddingVertical: 10 },
  redownload: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  redownloadGlyph: { fontSize: 17, fontWeight: '600' },
});
