import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { failureSummary } from '../fetchHealth';
import { TOUCH, font, icon, space, useCollectionTheme } from '../tokens';
import { IconButton } from './base';

const COPY = {
  login: (n) => ({ title: `需要重新登入 Threads 才能讀取 ${n}\u00A0篇`, action: '登入', icon: 'person-circle-outline' }),
  parse: () => ({
    title: 'Threads 可能改版了，暫時讀不到貼文內容。',
    detail: '已收藏的連結都保留著，之後可以全部重試。',
    action: '全部重試',
    icon: 'construct-outline',
  }),
  failed: (n) => ({ title: `${n}\u00A0篇讀取失敗`, action: '全部重試', icon: 'alert-circle-outline' }),
};

// Health strip at the top of the wall when posts keep failing to load: a
// hairline-ruled row like a magazine's errata notice (no filled box), a danger
// icon, the reason, and one accent text action. Hidden with ✕ until the number
// of failures grows again.
export function FetchHealth({ posts, onRetryAll, onLogin }) {
  const t = useCollectionTheme();
  const summary = useMemo(() => failureSummary(posts), [posts]);
  const [dismissed, setDismissed] = useState(null); // { kind, count } when closed
  if (!summary) return null;
  if (dismissed && dismissed.kind === summary.kind && summary.count <= dismissed.count) return null;
  const copy = COPY[summary.kind](summary.count);
  const act = summary.kind === 'login' ? onLogin : onRetryAll;
  const action = (
    <Pressable
      onPress={act}
      accessibilityRole="button"
      accessibilityLabel={summary.kind === 'login' ? '登入 Threads' : `全部重試 ${summary.count} 篇`}
      style={({ pressed }) => [styles.action, !!copy.detail && styles.actionBelow, pressed && { opacity: 0.6 }]}
    >
      <Text style={[t.font.label, { color: t.accent }]}>{copy.action}</Text>
    </Pressable>
  );
  // Short notices read as one line, 「3 篇讀取失敗 · 全部重試」; the longer
  // 改版 notice puts its action under the explanation so the text keeps its width.
  return (
    <View style={[styles.strip, { borderColor: t.border }]} accessibilityLiveRegion="polite" testID="fetch-health">
      <Ionicons name={copy.icon} size={icon.md} color={t.danger} style={copy.detail && styles.iconTop} />
      <View style={styles.text}>
        <Text style={[t.font.label, { color: t.foreground }]}>{copy.title}</Text>
        {!!copy.detail && <Text style={[t.font.meta, { color: t.mutedForeground }]}>{copy.detail}</Text>}
        {!!copy.detail && action}
      </View>
      {!copy.detail && action}
      <View style={[styles.close, copy.detail && styles.closeTop]}>
        <IconButton name="close" label="先不要提醒" color={t.mutedForeground} size={icon.md} onPress={() => setDismissed(summary)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: space.xs,
  },
  // Multi-line notice: icon and ✕ line up with the first line instead of the middle.
  iconTop: { alignSelf: 'flex-start', marginTop: space.sm },
  closeTop: { alignSelf: 'flex-start', marginTop: -(TOUCH - font.label.lineHeight) / 2 + space.sm - space.xs },
  text: { flex: 1, minWidth: 0, paddingVertical: space.sm, gap: 2 },
  action: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.sm },
  // Text-aligned under the explanation; the touch area still spans 48dp.
  actionBelow: { alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: -space.xs, marginBottom: -space.sm },
  close: { marginRight: -space.sm },
});
