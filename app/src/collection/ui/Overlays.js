import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../../ui/motion';
import { TOUCH, elevation, icon, space, useCollectionTheme } from '../tokens';
import { PrimaryButton, Sheet } from './base';

// A menu line, like an entry in a table of contents: hairline rule underneath,
// square corners. `last` drops the rule on the final row of a group.
function MenuRow({ iconName, label, onPress, danger, last }) {
  const t = useCollectionTheme();
  const color = danger ? t.danger : t.foreground;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.menuRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.border },
        pressed && { backgroundColor: t.muted },
      ]}
    >
      <Ionicons name={iconName} size={icon.md} color={color} />
      <Text style={[t.font.body, styles.flex, { color }]}>{label}</Text>
    </Pressable>
  );
}

// Long-press menu. Every action here also has a visible button on the detail page.
export function CardMenu({ post, onClose, onAction }) {
  if (!post) return null;
  const act = (kind) => () => onAction(kind, post);
  return (
    <Sheet visible onClose={onClose} title={`@${post.author}`}>
      <View style={styles.menu}>
        <MenuRow iconName={post.featured ? 'star' : 'star-outline'} label={post.featured ? '取消精選' : '設為精選（放大成整排）'} onPress={act('feature')} />
        <MenuRow iconName="pricetags-outline" label="編輯標籤" onPress={act('tags')} />
        {post.status !== 'sourceDeleted' && (
          <MenuRow iconName="download-outline" label={post.downloaded ? '再次下載' : '下載到相簿'} onPress={act('download')} />
        )}
        <MenuRow iconName="open-outline" label="在 Threads 開啟" onPress={act('open')} />
        {/* The destructive action stands apart, below a gap after the last rule. */}
        <View style={styles.divider} />
        <MenuRow iconName="trash-outline" label="刪除收藏" danger onPress={act('delete')} last />
      </View>
    </Sheet>
  );
}

// Snackbar for undoable actions and confirmations; polite, never steals focus.
export function Toast({ toast, onUndo, onHide }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const fade = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!toast) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 180, useNativeDriver: true }).start();
    const timer = setTimeout(onHide, toast.undo ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [toast, fade, reduce, onHide]);

  if (!toast) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { borderRadius: t.radius.sm }, elevation.level2, { backgroundColor: t.foreground, bottom: insets.bottom + 88, opacity: fade }]}
    >
      <Text style={[t.font.label, { color: t.background, flex: 1 }]}>{toast.message}</Text>
      {toast.undo && (
        <Pressable onPress={onUndo} accessibilityRole="button" style={styles.undo}>
          <Text style={[t.font.label, { color: t.background, textDecorationLine: 'underline' }]}>復原</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// Empty page of the magazine: an outlined icon, a WenKai heading over a short ink
// rule, then the explanation and one action — set flush left like the masthead.
export function EmptyState({ filtered, onAction }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { borderRadius: t.radius.xs, borderColor: t.border }]}>
        <Ionicons name={filtered ? 'pricetag-outline' : 'bookmarks-outline'} size={28} color={t.mutedForeground} />
      </View>
      <Text style={[t.font.title, { color: t.foreground }]}>
        {filtered ? '找不到符合的貼文' : '還沒有收藏'}
      </Text>
      <View style={[styles.emptyRule, { backgroundColor: t.foreground }]} />
      <Text style={[t.font.body, { color: t.mutedForeground }]}>
        {filtered ? '換個關鍵字或標籤，或清除篩選看看全部。' : '在 Threads 貼文點「分享」選「Threads 下載」，或按右上角的 ＋（收藏連結）貼上網址。'}
      </Text>
      <View style={styles.emptyAction}>
        <PrimaryButton title={filtered ? '清除篩選' : '貼上連結收藏'} iconName={filtered ? 'close' : 'add'} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menu: { paddingBottom: space.sm },
  menuRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xs,
  },
  divider: { height: space.lg },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
  },
  undo: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.md },
  empty: { alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xxl },
  emptyIcon: { width: 56, height: 56, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  emptyRule: { width: 32, height: 2 },
  emptyAction: { alignSelf: 'stretch', marginTop: space.sm },
});
