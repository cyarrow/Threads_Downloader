import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EASE_OUT, useReduceMotion } from '../../ui/motion';
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
// `selectable`: opened from a card wall, so it offers 選取多篇 (selection mode
// with this card already checked; the wall's title row has the same entry).
export function CardMenu({ post, onClose, onAction, selectable }) {
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
        {selectable && <MenuRow iconName="checkmark-circle-outline" label="選取多篇" onPress={act('select')} />}
        {!!post.author && <MenuRow iconName="color-wand-outline" label={`為 @${post.author} 建立規則`} onPress={act('rule')} />}
        {/* The destructive action stands apart, below a gap after the last rule. */}
        <View style={styles.divider} />
        <MenuRow iconName="trash-outline" label="刪除收藏" danger onPress={act('delete')} last />
      </View>
    </Sheet>
  );
}

// Toast motion: rises 25pt while fading in, leaves the way it came and a bit
// faster (the arrival deserves the time). Reduced motion: opacity only.
// Module scope: layout-animation builders made in render cost every re-render.
const TOAST_ENTER = FadeInDown.duration(250).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(200).easing(EASE_OUT);
const TOAST_ENTER_REDUCED = FadeIn.duration(150);
const TOAST_EXIT_REDUCED = FadeOut.duration(150);

// Each toast object gets its own key, so a new message replaces the old one by
// letting it leave and the new one arrive instead of re-fading in place.
const toastKeys = new WeakMap();
let nextToastKey = 0;
function keyOf(toast) {
  if (!toastKeys.has(toast)) toastKeys.set(toast, ++nextToastKey);
  return toastKeys.get(toast);
}

// Snackbar for undoable actions and confirmations; polite, never steals focus.
export function Toast({ toast, onUndo, onHide }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onHide, toast.undo ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [toast, onHide]);

  if (!toast) return null;
  return (
    <Animated.View
      key={keyOf(toast)}
      entering={reduce ? TOAST_ENTER_REDUCED : TOAST_ENTER}
      exiting={reduce ? TOAST_EXIT_REDUCED : TOAST_EXIT}
      accessibilityLiveRegion="polite"
      style={[styles.toast, { borderRadius: t.radius.sm }, elevation.level2, { backgroundColor: t.foreground, bottom: insets.bottom + 88 }]}
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
// `text` ({ title, body, action, icon }) overrides the wording, e.g. an author
// page whose posts were all deleted.
export function EmptyState({ filtered, onAction, text }) {
  const t = useCollectionTheme();
  if (text && !filtered) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { borderRadius: t.radius.xs, borderColor: t.border }]}>
          <Ionicons name={text.icon || 'person-outline'} size={28} color={t.mutedForeground} />
        </View>
        <Text style={[t.font.title, { color: t.foreground }]}>{text.title}</Text>
        <View style={[styles.emptyRule, { backgroundColor: t.foreground }]} />
        <Text style={[t.font.body, { color: t.mutedForeground }]}>{text.body}</Text>
        {!!onAction && (
          <View style={styles.emptyAction}>
            <PrimaryButton title={text.action} iconName="chevron-back" onPress={onAction} />
          </View>
        )}
      </View>
    );
  }
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
