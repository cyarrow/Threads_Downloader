import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cycleState, diffStates, tagCounts, tagStates } from '../batch';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { PrimaryButton, SecondaryButton, Sheet, TagChip } from './base';
import { NewTagForm } from './SaveSheet';

// 批次選取 (multi-select) on the 收藏 wall, a tag page and an author page:
// the header that replaces the masthead row, the check on each card, the action
// bar above the tab bar, and the two sheets it opens (tags for many posts,
// 刪除 N 篇 confirmation). Design rules: MASTER.md §9 「批次選取」.

// Height of the action bar above the bottom safe area (it sits on the tab bar,
// which already takes the safe area). The download pill is lifted by this much.
export const SELECTION_BAR_HEIGHT = 64;

function TextButton({ label, onPress, color, a11yLabel }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel || label}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[t.font.label, { color: color || t.accent }]}>{label}</Text>
    </Pressable>
  );
}

// 「已選 N 篇」 in place of the page title, with 全選 (全不選 once everything
// is picked) and 取消 (ends selection; so does Android back).
export function SelectionHeader({ count, allPicked, selectable, onSelectAll, onClear, onExit }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.header}>
      <Text
        style={[t.font.display, styles.title, { color: t.foreground }]}
        numberOfLines={1}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        已選 {count} 篇
      </Text>
      <TextButton
        label={allPicked ? '全不選' : '全選'}
        a11yLabel={allPicked ? '全部取消勾選' : `全選這裡的 ${selectable} 篇`}
        onPress={allPicked ? onClear : onSelectAll}
      />
      <TextButton label="取消" a11yLabel="結束選取" color={t.foreground} onPress={onExit} />
    </View>
  );
}

// One card while selecting. The card itself is drawn as usual but takes no
// touches (and is hidden from screen readers); this wrapper is the single
// touch target, a checkbox that toggles the card. Checked = an ink ring around
// the card and a filled round mark with ✓; unchecked = an empty round mark —
// shape, not colour, tells them apart. The mark sits on the photo's top-left corner
// (the one 底片 leaves free: N 張 is top-right, ▶ 影片 and the date at the bottom), in badge / onBadge (unchecked) or foreground / background
// (checked) so it reads on any photo. Loading / failed cards can't be picked.
export function SelectableCell({ post, selected, disabled, onToggle, children }) {
  const t = useCollectionTheme();
  if (disabled) {
    return (
      <View style={styles.dim} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
    );
  }
  const label = `${post.author ? `@${post.author}` : '貼文'}，${(post.caption || '').slice(0, 30)}`;
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onToggle}
      delayLongPress={350}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      aria-checked={!!selected}
      accessibilityLabel={`選取：${label}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
      {selected && (
        <View pointerEvents="none" style={[styles.ring, { borderColor: t.foreground, borderRadius: t.radius.sm }]} />
      )}
      <View
        pointerEvents="none"
        style={[
          styles.mark,
          selected
            ? { backgroundColor: t.foreground, borderColor: t.background }
            : { backgroundColor: t.badge, borderColor: t.onBadge },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={18} color={t.background} />}
      </View>
    </Pressable>
  );
}

function BarButton({ iconName, label, onPress, disabled, danger }) {
  const t = useCollectionTheme();
  const color = danger ? t.danger : t.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.barButton, { opacity: disabled ? 0.38 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={iconName} size={icon.lg - 2} color={color} />
      <Text style={[t.font.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

// The batch actions, on the panel surface (`card`) between the wall and the
// tab bar. The wall's list ends above it, so it never covers the last cards.
// Everything is disabled until a card is picked.
// `featureOn`: the 精選 button sets 精選 (true) or clears it (false; all picked
// posts are already featured).
export function SelectionBar({ count, featureOn, onAction }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const none = count === 0;
  return (
    <View
      style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border, paddingBottom: insets.bottom }]}
      accessibilityLabel="批次動作"
    >
      <BarButton iconName="pricetags-outline" label="加標籤" disabled={none} onPress={() => onAction('tags')} />
      <BarButton
        iconName={featureOn ? 'star-outline' : 'star'}
        label={featureOn ? '精選' : '取消精選'}
        disabled={none}
        onPress={() => onAction('feature')}
      />
      <BarButton iconName="download-outline" label="下載" disabled={none} onPress={() => onAction('download')} />
      <BarButton iconName="trash-outline" label="刪除" danger disabled={none} onPress={() => onAction('delete')} />
    </View>
  );
}

// Tags for many posts at once. Each chip is a tri-state checkbox seeded from
// the selection: ✓ filled = every picked post has it, dashed edge + — + 「n/N」
// = only some do, plain = none. A tap cycles it (batch.cycleState); a chip that
// started mixed comes back round to "leave as is". Applying changes only the
// tags the user touched (batch.diffStates): an untouched mixed tag stays on
// exactly the posts that had it. Mount it fresh each time it opens.
export function BatchTagSheet({ posts, ids, index, onCreateTag, onApply, onClose }) {
  const t = useCollectionTheme();
  const count = ids.length;
  const [initial] = useState(() => tagStates(posts, ids));
  const [counts] = useState(() => tagCounts(posts, ids));
  const [states, setStates] = useState(initial);
  const [creating, setCreating] = useState(null); // { parentId } while the form is open
  const stateOf = (id) => states[id] || 'none';
  const tap = (id) => setStates((s) => ({ ...s, [id]: cycleState(s[id] || 'none', initial[id] || 'none') }));
  const diff = diffStates(initial, states);
  const names = (list) => list.map((id) => index.byId[id]?.name).filter(Boolean).join('、');
  const changed = diff.add.length + diff.remove.length > 0;

  const create = async (name, parentId) => {
    const tag = await onCreateTag(name, parentId);
    setCreating(null);
    // Like the single-post picker: a new tag starts on (for every picked post).
    if (tag) setStates((s) => ({ ...s, [tag.id]: 'all' }));
  };

  const chip = (tag, hue) => {
    const state = stateOf(tag.id);
    const n = counts[tag.id] || 0;
    const mixed = state === 'some';
    const stateText = state === 'all' ? '全部都有' : mixed ? `${count} 篇裡有 ${n} 篇` : '都沒有';
    return (
      <TagChip
        key={tag.id}
        hue={hue}
        label={mixed ? `${tag.name} ${n}/${count}` : tag.name}
        selected={state === 'all'}
        mixed={mixed}
        a11yLabel={`${tag.name}，${stateText}`}
        onPress={() => tap(tag.id)}
      />
    );
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={`${count} 篇的標籤`}
      footer={
        <View style={styles.footer}>
          <Text style={[t.font.meta, { color: t.mutedForeground }]} accessibilityLiveRegion="polite">
            {changed
              ? [diff.add.length && `加上：${names(diff.add)}`, diff.remove.length && `移除：${names(diff.remove)}`].filter(Boolean).join(' · ')
              : '還沒有變更'}
          </Text>
          <PrimaryButton title={`套用到 ${count} 篇`} disabled={!changed} onPress={() => onApply(diff)} />
        </View>
      }
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View
          style={styles.legendBlock}
          accessible
          accessibilityLabel="打勾代表全部都有，橫線代表只有部分有。點標籤切換全部加上或全部移除；部分有的標籤再點一輪會回到原樣，沒點過的標籤不會變。"
        >
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Ionicons name="checkmark" size={icon.sm} color={t.mutedForeground} />
              <Text style={[t.font.meta, { color: t.mutedForeground }]}>全部都有</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="remove" size={icon.sm} color={t.mutedForeground} />
              <Text style={[t.font.meta, { color: t.mutedForeground }]}>部分有</Text>
            </View>
          </View>
          <Text style={[t.font.meta, { color: t.mutedForeground }]}>點一下全部加上，再點全部移除；部分有的標籤再點一輪回到原樣。沒點過的標籤不會變。</Text>
        </View>
        {index.parents.map((p) => {
          const kids = index.children[p.id] || [];
          return (
            <View key={p.id} style={styles.family}>
              <View style={styles.chips}>{chip(p, p.color)}</View>
              {kids.length > 0 && (
                <View style={[styles.chips, styles.childRow, { borderLeftColor: t.border }]}>{kids.map((c) => chip(c, p.color))}</View>
              )}
            </View>
          );
        })}
        <View style={styles.chips}>
          <TagChip neutral iconName="add" label="新增標籤" expanded={false} onPress={() => setCreating({ parentId: null })} />
        </View>
        {creating && (
          <NewTagForm index={index} parentId={creating.parentId} onCreate={create} onCancel={() => setCreating(null)} />
        )}
      </ScrollView>
    </Sheet>
  );
}

// 刪除 N 篇收藏？ — a batch delete asks first (a single delete doesn't; MASTER
// §6). The toast afterwards still offers 復原 for all of them.
export function ConfirmDeleteSheet({ count, onConfirm, onClose }) {
  const t = useCollectionTheme();
  return (
    <Sheet visible onClose={onClose} title={`刪除 ${count} 篇收藏？`}>
      <View style={styles.confirm}>
        <Text style={[t.font.body, { color: t.foreground }]}>
          這 {count} 篇會從收藏裡移除，已經存到相簿的檔案不受影響。刪除後幾秒內可以按「復原」。
        </Text>
        <View style={styles.confirmRow}>
          <SecondaryButton title="取消" onPress={onClose} />
          <SecondaryButton title={`刪除 ${count} 篇`} iconName="trash-outline" danger onPress={onConfirm} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginRight: -space.sm, minHeight: TOUCH },
  title: { flex: 1, minWidth: 0 },
  textButton: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.sm },
  dim: { opacity: 0.4 },
  // Drawn just outside the card (in the cell's gutter), so the masonry never moves.
  ring: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderWidth: 2 },
  mark: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  barButton: { flex: 1, minHeight: SELECTION_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: space.xs },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: space.md, paddingBottom: space.md },
  legendBlock: { gap: space.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  family: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  childRow: { borderLeftWidth: 2, paddingLeft: space.sm, marginLeft: space.xs },
  footer: { gap: space.sm, paddingTop: space.sm },
  confirm: { gap: space.lg, paddingBottom: space.sm },
  confirmRow: { flexDirection: 'row', gap: space.sm },
});
