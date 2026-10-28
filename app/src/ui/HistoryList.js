import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { summary, timeAgo } from '../historyModel';
import { Card, IconButton } from './components';
import { TOUCH, type, useTheme } from './theme';

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
        <Text style={[type.footnote, { color: t.secondary }]} accessibilityRole="header">
          最近下載
        </Text>
        <Pressable onPress={confirmClear} accessibilityRole="button" style={styles.clearTarget}>
          <Text style={[type.footnote, { color: t.accent }]}>清除</Text>
        </Pressable>
      </View>
      <Card style={styles.card}>
        {items.map((item, i) => (
          <View key={item.code} style={styles.row}>
            <Pressable
              onPress={() => Linking.openURL(item.url)}
              accessibilityRole="link"
              accessibilityLabel={`${item.author ? `@${item.author}` : 'Threads 貼文'}，${summary(item)}，${timeAgo(item.savedAt)}`}
              accessibilityHint="在 Threads 開啟這篇貼文"
              style={({ pressed }) => [styles.main, pressed && { backgroundColor: t.fill }]}
            >
              <View>
                {item.thumb ? (
                  <Image source={{ uri: item.thumb }} style={[styles.thumb, { backgroundColor: t.fill }]} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: t.fill }]}>
                    <Ionicons name="images-outline" size={22} color={t.tertiary} />
                  </View>
                )}
                {item.videos > 0 && (
                  <View style={[styles.play, { backgroundColor: t.scrim }]}>
                    <Ionicons name="play" size={10} color={t.onFill} />
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.text,
                  i < items.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.separator,
                  },
                ]}
              >
                <Text style={[type.headline, { color: t.label }]} numberOfLines={1}>
                  {item.author ? `@${item.author}` : 'Threads 貼文'}
                </Text>
                {!!item.caption && (
                  <Text style={[type.subhead, { color: t.secondary }]} numberOfLines={1}>
                    {item.caption}
                  </Text>
                )}
                <Text style={[type.footnote, { color: t.secondary }]}>
                  {summary(item)} · {timeAgo(item.savedAt)}
                </Text>
              </View>
            </Pressable>
            <View
              style={[
                styles.action,
                i < items.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.separator,
                },
              ]}
            >
              <IconButton
                icon="arrow-down"
                label="重新下載"
                size={18}
                filled
                disabled={disabled}
                onPress={() => onRedownload(item.url)}
              />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  clearTarget: { minHeight: TOUCH, minWidth: TOUCH, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16 },
  card: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  thumb: { width: 52, height: 52, borderRadius: 8, marginVertical: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  play: {
    position: 'absolute',
    right: 4,
    bottom: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 1, marginLeft: 12, paddingVertical: 10 },
  action: { justifyContent: 'center', paddingRight: 8 },
});
