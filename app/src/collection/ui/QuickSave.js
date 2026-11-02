// 快速收藏面板: the save sheet's compact mode for posts shared in from Threads.
// Up to three big tag rows (one tap = save with that tag and go back), then
// 其他標籤… to open the full picker. Spec: pages/save-sheet.md § 快速面板.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SETTLE_MS, lockPicks, postSettled, quickReasonText, rankQuickTags, slotCount } from '../quickSave';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, font, icon, radius, space, tagColors, useCollectionTheme } from '../tokens';

const ROW_HEIGHT = 64; // ≥ 56dp target; fits name + reason at default text size
const RULE = StyleSheet.hairlineWidth * 2;

// One full-width row of the outlined list. Fills with ink while pressed (and
// once picked, when it also swaps the colour square for a ✓).
function Row({ first, onPress, disabled, picked, a11y, children }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      {...a11y}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: RULE, borderTopColor: t.border },
        (pressed || picked) && { backgroundColor: t.foreground },
      ]}
    >
      {({ pressed }) => children(pressed || picked)}
    </Pressable>
  );
}

function TagRow({ pick, index, first, picked, disabled, onPress }) {
  const t = useCollectionTheme();
  const label = tagLabel(pick.tag, index.byId);
  const reason = quickReasonText(pick.reason);
  return (
    <Row
      first={first}
      picked={picked}
      disabled={disabled}
      onPress={onPress}
      a11y={{
        accessibilityRole: 'button',
        accessibilityLabel: `存到「${label}」${reason ? `，${reason}` : ''}`,
        accessibilityHint: '收藏並回到 Threads',
        accessibilityState: { disabled: !!disabled, selected: !!picked },
      }}
    >
      {(ink) => (
        <>
          <View style={styles.marker}>
            {picked ? (
              <Ionicons name="checkmark" size={icon.md} color={t.background} />
            ) : (
              <View style={[styles.square, { backgroundColor: tagColors(tagHue(pick.tag, index.byId), t.scheme, false).dot }]} />
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={[font.headline, { color: ink ? t.background : t.foreground }]} numberOfLines={1}>
              {label}
            </Text>
            {!!reason && (
              <Text style={[font.meta, { color: ink ? t.background : t.mutedForeground }]} numberOfLines={1}>
                {reason}
              </Text>
            )}
          </View>
        </>
      )}
    </Row>
  );
}

function SkeletonRow({ first }) {
  const t = useCollectionTheme();
  return (
    <View style={[styles.row, !first && { borderTopWidth: RULE, borderTopColor: t.border }]}>
      <View style={styles.marker}>
        <View style={[styles.square, { backgroundColor: t.field }]} />
      </View>
      <View style={styles.rowText}>
        <View style={[styles.bar, { width: '45%', backgroundColor: t.field }]} />
        <View style={[styles.bar, styles.barSmall, { width: '28%', backgroundColor: t.field }]} />
      </View>
    </View>
  );
}

// The tag rows lock the first time they appear (see lockPicks): while the post
// is still being read they show as skeletons for up to SETTLE_MS, then the best
// picks so far are drawn once and never reorder. 其他標籤… sits below them and is
// usable from the start, as are 先存到未分類 and the download switch in the footer.
export function QuickPanel({ post, index, suggestions, recentIds, onPick, onMore }) {
  const t = useCollectionTheme();
  const [timedOut, setTimedOut] = useState(false);
  const [locked, setLocked] = useState(null);
  const [picked, setPicked] = useState(null);
  const done = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = timedOut || postSettled(post);
  const live = !locked && ready ? rankQuickTags({ suggestions, recentIds, index }) : null;
  const next = lockPicks(locked, live, ready);
  if (next !== locked) setLocked(next); // render-time lock: the rows never draw unlocked
  // A tag deleted elsewhere while the panel is open just drops out.
  const picks = locked && locked.filter((p) => index.byId[p.tag.id]).map((p) => ({ ...p, tag: index.byId[p.tag.id] }));

  const pick = (id) => {
    if (done.current) return; // a second tap must not save twice
    done.current = true;
    setPicked(id);
    onPick(id);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <Text style={[font.headline, styles.flex, { color: t.foreground }]} accessibilityRole="header">
          加上標籤
        </Text>
        <Text style={[font.meta, { color: t.mutedForeground }]}>點一下就完成</Text>
      </View>
      <View style={[styles.list, { borderColor: t.outline }]}>
        {picks ? (
          picks.map((p, i) => (
            <TagRow
              key={p.tag.id}
              pick={p}
              index={index}
              first={i === 0}
              picked={picked === p.tag.id}
              disabled={!!picked}
              onPress={() => pick(p.tag.id)}
            />
          ))
        ) : (
          <View accessible accessibilityLabel="正在找適合的標籤">
            {Array.from({ length: slotCount(index) }, (_, i) => (
              <SkeletonRow key={i} first={i === 0} />
            ))}
          </View>
        )}
        <Row
          first={picks ? picks.length === 0 : slotCount(index) === 0}
          disabled={!!picked}
          onPress={onMore}
          a11y={{ accessibilityRole: 'button', accessibilityState: { expanded: false, disabled: !!picked } }}
        >
          {(ink) => (
            <>
              <View style={styles.marker}>
                <Ionicons name="pricetags-outline" size={icon.md} color={ink ? t.background : t.foreground} />
              </View>
              <Text style={[font.body, styles.flex, { color: ink ? t.background : t.foreground }]}>其他標籤…</Text>
              <Ionicons name="chevron-down" size={icon.sm} color={ink ? t.background : t.mutedForeground} />
            </>
          )}
        </Row>
      </View>
    </View>
  );
}

// Compact mode's finish button: same spot as 完成, outlined so the tag rows
// stay the main choice. Saves with no tags, like 完成 with nothing picked.
export function UnsortedButton({ onPress }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.unsorted,
        { borderColor: t.foreground },
        pressed && { backgroundColor: t.foreground },
      ]}
    >
      {({ pressed }) => (
        <>
          <Ionicons name="file-tray-outline" size={icon.md} color={pressed ? t.background : t.foreground} />
          <Text style={[font.headline, { color: pressed ? t.background : t.foreground }]}>先存到未分類</Text>
        </>
      )}
    </Pressable>
  );
}

// Settings row for the 快速面板 preference (a whole-row switch). Lives here so
// the settings sheet only needs one line for it.
export function QuickSaveSettingRow({ value, onChange }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!value }}
      aria-checked={!!value} // react-native-web reads only the aria-* form
      accessibilityLabel="分享時用快速面板"
      accessibilityHint="從 Threads 分享進來時，先列出最可能的 3 個標籤，點一下就完成"
      style={({ pressed }) => [styles.settingRow, pressed && { backgroundColor: t.muted }]}
    >
      <Ionicons name="flash-outline" size={icon.lg} color={t.foreground} />
      <View style={styles.flex}>
        <Text style={[font.body, { color: t.foreground }]}>分享時用快速面板</Text>
        <Text style={[font.meta, { color: t.mutedForeground }]}>列出 3 個最可能的標籤，點一下就完成</Text>
      </View>
      <Switch
        value={!!value}
        onValueChange={onChange}
        trackColor={{ true: t.primary, false: t.mutedForeground }}
        thumbColor={value ? t.onPrimary : t.onBadge}
        activeThumbColor={t.onPrimary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: space.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  list: { borderWidth: RULE, borderRadius: radius.sm, overflow: 'hidden' },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  marker: { width: icon.md, alignItems: 'center' },
  square: { width: 12, height: 12, borderRadius: 1 },
  rowText: { flex: 1, gap: 2 },
  bar: { height: 14, borderRadius: radius.xs },
  barSmall: { height: 10, marginTop: 4 },
  unsorted: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  settingRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    minWidth: TOUCH,
  },
});
