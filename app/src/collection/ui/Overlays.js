import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '../../ui/motion';
import { TOUCH, elevation, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { PrimaryButton, Sheet } from './base';

function MenuRow({ iconName, label, onPress, danger }) {
  const t = useCollectionTheme();
  const color = danger ? t.danger : t.foreground;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: t.muted }]}
    >
      <Ionicons name={iconName} size={icon.lg} color={color} />
      <Text style={[font.body, { color }]}>{label}</Text>
    </Pressable>
  );
}

// Long-press menu. Every action here also has a visible button on the detail page.
export function CardMenu({ post, onClose, onAction }) {
  const t = useCollectionTheme();
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
        <View style={[styles.divider, { backgroundColor: t.border }]} />
        <MenuRow iconName="trash-outline" label="刪除收藏" danger onPress={act('delete')} />
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
      style={[styles.toast, elevation.level2, { backgroundColor: t.foreground, bottom: insets.bottom + 88, opacity: fade }]}
    >
      <Text style={[font.label, { color: t.background, flex: 1 }]}>{toast.message}</Text>
      {toast.undo && (
        <Pressable onPress={onUndo} accessibilityRole="button" style={styles.undo}>
          <Text style={[font.label, { color: t.background, textDecorationLine: 'underline' }]}>復原</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export function EmptyState({ filtered, onAction }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: t.muted }]}>
        <Ionicons name={filtered ? 'pricetag-outline' : 'bookmarks-outline'} size={36} color={t.mutedForeground} />
      </View>
      <Text style={[font.headline, { color: t.foreground, textAlign: 'center' }]}>
        {filtered ? '找不到符合的貼文' : '還沒有收藏'}
      </Text>
      <Text style={[font.body, { color: t.mutedForeground, textAlign: 'center' }]}>
        {filtered ? '換個關鍵字或標籤，或清除篩選看看全部。' : '在 Threads 貼文點「分享」選「Threads 下載」，\n或按右下角的 ＋ 貼上連結。'}
      </Text>
      <View style={styles.emptyAction}>
        <PrimaryButton title={filtered ? '清除篩選' : '貼上連結收藏'} iconName={filtered ? 'close' : 'add'} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { paddingBottom: space.sm },
  menuRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.sm },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    minHeight: TOUCH,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
  },
  undo: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.md },
  empty: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xxxl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyAction: { alignSelf: 'stretch', marginTop: space.sm },
});
