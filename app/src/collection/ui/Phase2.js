// Phase 2 screens: tag manager and the rediscover card. (未分類 triage is the
// 翻翻 deck's 未分類 mode now.)
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tagNameError } from '../collectionModel';
import { cardStill } from '../media';
import { TAG_HUES } from '../palette';
import { tagHue, tagLabel } from '../tagModel';
import { BRAND_FONT, TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet, TagChip, useKeyboardOverlap } from './base';
import { SprocketRule, TagMark } from './theme';

// Full-screen page (標籤管理, 自動標籤規則): back arrow + title, content, optional footer.
export function Page({ title, onClose, children, footer }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const rootRef = useRef(null);
  const keyboard = useKeyboardOverlap(rootRef);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View ref={rootRef} collapsable={false} style={[styles.page, { backgroundColor: t.background, paddingTop: insets.top, paddingBottom: keyboard }]}>
        <View style={[styles.topBar, { borderBottomColor: t.border }]}>
          <IconButton name="arrow-back" label="返回" onPress={onClose} />
          <Text style={[t.font.title, styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
        {footer && <View style={[styles.footer, { paddingBottom: keyboard ? space.md : insets.bottom + space.md, borderTopColor: t.border, backgroundColor: t.background }]}>{footer}</View>}
      </View>
    </Modal>
  );
}

// --- Tag manager ---------------------------------------------------------------

function TagEditSheet({ tag, index, counts, rules = [], onClose, onRename, onRecolor, onMerge, onDelete }) {
  const t = useCollectionTheme();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('edit'); // edit | merge | confirmDelete
  const affected = counts[tag.id] || 0;
  const kids = index.children[tag.id] || [];
  // 自動標籤規則 that add this tag (or, for a delete, one of its 小標籤 too).
  const ownRules = rules.filter((r) => r.tagId === tag.id).length;
  const familyRules = rules.filter((r) => r.tagId === tag.id || kids.some((k) => k.id === r.tagId)).length;
  const targets = Object.values(index.byId).filter((x) => x.id !== tag.id && x.parentId !== tag.id);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed !== tag.name) {
      const problem = tagNameError(trimmed, tag.parentId, Object.values(index.byId).filter((x) => x.id !== tag.id));
      if (problem) return setError(problem);
      onRename(tag.id, trimmed);
    }
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={tagLabel(tag, index.byId)}>
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        {mode === 'edit' && (
          <>
            <Text nativeID="tagNameLabel" style={[t.font.kicker, { color: t.mutedForeground }]}>名稱</Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(null);
              }}
              accessibilityLabel="標籤名稱"
              accessibilityLabelledBy="tagNameLabel"
              style={[t.font.body, styles.input, { borderRadius: t.radius.sm, color: t.foreground, backgroundColor: t.field, borderColor: error ? t.danger : t.field }]}
            />
            {error && (
              <View style={styles.inline} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
                <Text style={[t.font.meta, { color: t.danger }]}>{error}</Text>
              </View>
            )}
            {!tag.parentId && (
              <>
                <Text style={[t.font.kicker, styles.fieldLabel, { color: t.mutedForeground }]}>顏色（小標籤會一起換）</Text>
                <View style={styles.swatches}>
                  {TAG_HUES.filter((h) => h !== 'slate').map((h) => {
                    const mark = t.tag(h).mark;
                    const on = tag.color === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => onRecolor(tag.id, h)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`顏色 ${h}`}
                        style={styles.swatchTarget}
                      >
                        {/* Square like the tag marker; the chosen one gets an ink frame and ✓. */}
                        <View style={[styles.swatchFrame, { borderRadius: t.radius.sm, borderColor: on ? t.foreground : 'transparent' }]}>
                          <View style={[styles.swatch, { borderRadius: t.radius.xs, backgroundColor: mark }]}>
                            {on && <Ionicons name="checkmark" size={18} color={t.onBadge} />}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <Text style={[t.font.meta, { color: t.mutedForeground }]}>
              {affected} 篇貼文{kids.length ? ` · ${kids.length} 個小標籤` : ''}
            </Text>
            <View style={styles.row}>
              <SecondaryButton title="合併到…" iconName="git-merge-outline" onPress={() => setMode('merge')} />
              <SecondaryButton title="刪除" iconName="trash-outline" danger onPress={() => setMode('confirmDelete')} />
            </View>
            <PrimaryButton title="儲存" onPress={save} />
          </>
        )}
        {mode === 'merge' && (
          <>
            <Text style={[t.font.body, { color: t.foreground }]}>
              把「{tag.name}」的 {affected} 篇貼文移到哪個標籤？{kids.length ? '它的小標籤會一起搬過去。' : ''}
              {ownRules ? `${ownRules} 條自動標籤規則會改成加上新的標籤。` : ''}
            </Text>
            <View style={styles.chips}>
              {targets.map((x) => (
                <TagChip
                  key={x.id}
                  hue={tagHue(x, index.byId)}
                  label={tagLabel(x, index.byId)}
                  expanded={false}
                  onPress={() => {
                    onMerge(tag.id, x.id);
                    onClose();
                  }}
                />
              ))}
            </View>
            <SecondaryButton title="取消" onPress={() => setMode('edit')} />
          </>
        )}
        {mode === 'confirmDelete' && (
          <>
            <Text style={[t.font.body, { color: t.foreground }]}>
              刪除「{tag.name}」{kids.length ? `和它的 ${kids.length} 個小標籤` : ''}？{affected} 篇貼文會拿掉這個標籤，貼文本身不會被刪除。
              {familyRules ? `會加上這個標籤的 ${familyRules} 條自動標籤規則也會一起刪除。` : ''}
            </Text>
            <View style={styles.row}>
              <SecondaryButton title="取消" onPress={() => setMode('edit')} />
              <SecondaryButton
                title="確定刪除"
                iconName="trash-outline"
                danger
                onPress={() => {
                  onDelete(tag.id);
                  onClose();
                }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

export function TagManager({ posts, index, rules, onClose, onRename, onRecolor, onMerge, onDelete }) {
  const t = useCollectionTheme();
  const [editing, setEditing] = useState(null);
  const counts = useMemo(() => {
    const c = {};
    for (const p of posts) for (const id of p.tagIds) c[id] = (c[id] || 0) + 1;
    return c;
  }, [posts]);
  const editingTag = editing && index.byId[editing];

  // Reads like a magazine's contents page: tag marker, name, count, each line
  // on a hairline; 小標籤 are indented under their 大標籤 with a smaller marker.
  const Row = ({ tag, child }) => (
    <Pressable
      onPress={() => setEditing(tag.id)}
      accessibilityRole="button"
      accessibilityHint="改名、換顏色、合併或刪除"
      style={({ pressed }) => [styles.tagRow, child && styles.tagRowChild, { borderBottomColor: t.border }, pressed && { backgroundColor: t.muted }]}
    >
      <TagMark hue={tagHue(tag, index.byId)} size={child ? 'xs' : 'md'} style={child && styles.markSmall} />
      <Text style={[child ? t.font.body : t.font.headline, { color: t.foreground, flex: 1 }]}>{tag.name}</Text>
      <Text style={[t.font.caption, styles.count, { color: t.mutedForeground }]}>{counts[tag.id] || 0} 篇</Text>
      <Ionicons name="chevron-forward" size={icon.sm} color={t.mutedForeground} />
    </Pressable>
  );

  return (
    <Page title="標籤管理" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.list}>
        {index.parents.length === 0 && (
          <Text style={[t.font.body, { color: t.mutedForeground }]}>還沒有標籤。收藏貼文時可以新增。</Text>
        )}
        {index.parents.map((p) => (
          <View key={p.id}>
            <Row tag={p} />
            {(index.children[p.id] || []).map((c) => (
              <Row key={c.id} tag={c} child />
            ))}
          </View>
        ))}
      </ScrollView>
      {editingTag && (
        <TagEditSheet
          key={editingTag.id}
          tag={editingTag}
          index={index}
          counts={counts}
          rules={rules}
          onClose={() => setEditing(null)}
          onRename={onRename}
          onRecolor={onRecolor}
          onMerge={onMerge}
          onDelete={onDelete}
        />
      )}
    </Page>
  );
}

// --- Rediscover card on the wall ----------------------------------------------

export function RediscoverCard({ pick, onOpen, onShuffle, onDismiss }) {
  const t = useCollectionTheme();
  if (!pick) return null;
  return (
    // A 回顧 column: ink rule on top (底片: a film strip), a kicker, the heading,
    // three thumbnails, closed by a hairline — no box, like a recurring section.
    <View style={[styles.rediscover, { borderTopColor: t.foreground, borderBottomColor: t.border }, t.rule === 'sprocket' && styles.stripTop]}>
      {t.rule === 'sprocket' && <SprocketRule height={8} pitch={12} />}
      <View style={styles.rediscoverHead}>
        <View style={styles.flex}>
          <View style={styles.kickerRow}>
            <Ionicons name="time-outline" size={icon.sm} color={t.mutedForeground} />
            <Text style={[t.font.kicker, { color: t.mutedForeground }]}>回顧</Text>
          </View>
          <Text style={[t.font.title, { color: t.foreground }]}>{pick.title}</Text>
          <Text style={[t.font.meta, { color: t.mutedForeground }]}>{pick.subtitle}</Text>
        </View>
        <IconButton name="close" label="今天先不要" color={t.mutedForeground} size={icon.md} onPress={onDismiss} />
      </View>
      <View style={styles.thumbs}>
        {pick.posts.slice(0, 3).map((p) => {
          const still = cardStill(p);
          return (
            <Pressable
              key={p.id}
              onPress={() => onOpen(p)}
              accessibilityRole="button"
              accessibilityLabel={`@${p.author}，${(p.caption || '').slice(0, 20)}`}
              style={[styles.thumb, { borderRadius: t.radius.xs, backgroundColor: t.muted }]}
            >
              {still ? (
                <Image source={still} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              ) : (
                <Text style={[t.font.meta, styles.thumbText, { color: t.foreground }]} numberOfLines={4}>
                  {p.caption}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {onShuffle && (
        <Pressable onPress={onShuffle} accessibilityRole="button" style={styles.shuffle}>
          <Ionicons name="shuffle" size={icon.sm} color={t.accent} />
          <Text style={[t.font.label, { color: t.accent }]}>隨機翻翻</Text>
        </Pressable>
      )}
    </View>
  );
}

const RULE = StyleSheet.hairlineWidth * 2;
const GUTTER = 20; // same screen margin as the card wall

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, borderBottomWidth: RULE },
  topTitle: { flex: 1, marginLeft: space.xs },
  footer: { borderTopWidth: RULE, padding: space.lg },
  list: { paddingHorizontal: GUTTER - space.sm, paddingVertical: space.sm },
  tagRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.sm,
    borderBottomWidth: RULE,
  },
  tagRowChild: { minHeight: TOUCH, paddingLeft: space.sm + 20 },
  markSmall: { marginHorizontal: 1 },
  stripTop: { borderTopWidth: 0, paddingTop: 0 },
  count: { letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  fieldLabel: { marginTop: space.xs },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { gap: space.md, paddingBottom: space.md },
  input: { minHeight: TOUCH, borderWidth: 1.5, paddingHorizontal: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginLeft: -space.xs },
  swatchTarget: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  swatchFrame: { padding: 2, borderWidth: 2, },
  swatch: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rediscover: { borderTopWidth: 2, borderBottomWidth: RULE, paddingTop: space.sm, paddingBottom: space.xs, gap: space.md },
  rediscoverHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginRight: -space.sm },
  thumbs: { flexDirection: 'row', gap: space.sm },
  thumb: { flex: 1, aspectRatio: 1, overflow: 'hidden', justifyContent: 'center' },
  thumbText: { padding: space.sm, fontFamily: BRAND_FONT },
  shuffle: { minHeight: TOUCH, marginTop: -space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' },
});
