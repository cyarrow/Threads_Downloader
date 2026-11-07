// Phase 2 screens: tag manager, triage of 未分類 posts, and the rediscover card.
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tagNameError } from '../collectionModel';
import { cardStill } from '../media';
import { TAG_HUES } from '../palette';
import { reasonText, suggestTags } from '../suggest';
import { tagHue, tagLabel } from '../tagModel';
import { BRAND_FONT, TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet, TagChip } from './base';
import { PhotoBack, Print, SprocketRule, TagMark } from './theme';

// Full-screen page (標籤管理, 自動標籤規則): back arrow + title, content, optional footer.
export function Page({ title, onClose, children, footer }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: t.border }]}>
          <IconButton name="arrow-back" label="返回" onPress={onClose} />
          <Text style={[t.font.title, styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
        {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, borderTopColor: t.border, backgroundColor: t.background }]}>{footer}</View>}
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

// --- Triage: give 未分類 posts a tag, one at a time -----------------------------

export function Triage({ posts, index, onClose, onTag, onMoreTags }) {
  const t = useCollectionTheme();
  // The queue is fixed when triage opens so cards don't jump while tagging.
  const [queue] = useState(() => posts.filter((p) => !p.tagIds.length && p.status === 'ready').map((p) => p.id));
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState({ tagged: 0, skipped: 0 });
  const post = posts.find((p) => p.id === queue[pos]);
  const finished = pos >= queue.length;
  const suggestions = post ? suggestTags(post, posts, index) : [];
  const still = post && cardStill(post);

  const next = (kind) => {
    setDone((d) => ({ ...d, [kind]: d[kind] + 1 }));
    setPos((i) => i + 1);
  };

  return (
    <Page title={finished ? '整理完成' : `整理未分類 ${Math.min(pos + 1, queue.length)}/${queue.length}`} onClose={onClose}>
      {finished ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={t.success} />
          <Text style={[t.font.title, { color: t.foreground }]}>這次分類了 {done.tagged} 篇</Text>
          <View style={[styles.shortRule, { backgroundColor: t.foreground }]} />
          {done.skipped > 0 && <Text style={[t.font.body, { color: t.mutedForeground }]}>略過 {done.skipped} 篇，之後可以再整理</Text>}
          <PrimaryButton title="回到收藏" onPress={onClose} />
        </View>
      ) : post ? (
        <>
          {/* Progress as a thin ink rule growing along a hairline. */}
          <View style={[styles.progress, { backgroundColor: t.border }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: queue.length, now: pos }}>
            <View style={[styles.progressBar, { backgroundColor: t.foreground, width: `${(pos / queue.length) * 100}%` }]} />
          </View>
          <ScrollView contentContainerStyle={styles.triageBody}>
            {/* The post as it sits on the wall: no box, image, kicker, words, meta, rule
                (底片: a print, or the back of a photo for a text-only post). */}
            <View style={[styles.triageCard, { borderBottomColor: t.border }, t.printFrame && styles.unruled]}>
              {still && (
                <Print savedAt={post.savedAt} kind={post.media[0]?.type === 'video' ? 'video' : post.media.length > 1 ? 'multi' : null} count={post.media.length} style={styles.mediaGap}>
                  <Image source={still} style={[styles.triageImage, { backgroundColor: t.muted }]} contentFit="cover" accessible={false} />
                </Print>
              )}
              {!still && !!post.caption && t.textCard === 'lined' && (
                <PhotoBack hue="slate" text={post.caption} savedAt={post.savedAt} numberOfLines={6} style={styles.mediaGap} />
              )}
              <View style={styles.kickerRow}>
                <TagMark hue="slate" />
                <Text style={[t.font.kicker, { color: t.mutedForeground }]}>未分類</Text>
              </View>
              {!!post.caption && (still || t.textCard !== 'lined') && (
                <Text style={[still ? t.font.card : t.font.quote, { color: t.foreground }]} numberOfLines={still ? 3 : 6}>
                  {post.caption}
                </Text>
              )}
              <Text style={[t.font.caption, { color: t.mutedForeground }]}>@{post.author}</Text>
            </View>
          </ScrollView>
          <View style={styles.triageActions}>
            {suggestions.map(({ tag, reasons }) => (
              // Suggested tag as a large outlined chip: tag marker + 大標籤 › 小標籤, reason below.
              <Pressable
                key={tag.id}
                onPress={() => {
                  onTag(post.id, [tag.id]);
                  next('tagged');
                }}
                accessibilityRole="button"
                accessibilityLabel={`放到 ${tagLabel(tag, index.byId)}，${reasonText(reasons)}`}
                style={({ pressed }) => [styles.bigTag, { borderRadius: t.radius.sm, borderColor: t.outline, opacity: pressed ? 0.75 : 1 }]}
              >
                <TagMark hue={tagHue(tag, index.byId)} size="md" />
                <View style={styles.flex}>
                  <Text style={[t.font.headline, { color: t.foreground }]}>{tagLabel(tag, index.byId)}</Text>
                  <Text style={[t.font.meta, { color: t.mutedForeground }]} numberOfLines={1}>
                    {reasonText(reasons)}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={icon.md} color={t.foreground} />
              </Pressable>
            ))}
            <View style={styles.row}>
              <SecondaryButton title="其他標籤" iconName="pricetags-outline" onPress={() => onMoreTags(post, () => next('tagged'))} />
              <SecondaryButton title="略過" iconName="play-skip-forward-outline" onPress={() => next('skipped')} />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={[t.font.body, { color: t.mutedForeground }]}>沒有需要整理的貼文。</Text>
          <PrimaryButton title="回到收藏" onPress={onClose} />
        </View>
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
  unruled: { borderBottomWidth: 0 },
  mediaGap: { marginBottom: 2 },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  shortRule: { width: 32, height: 2 },
  progress: { height: 2, marginHorizontal: GUTTER, marginTop: space.lg },
  progressBar: { height: 2 },
  triageBody: { paddingHorizontal: GUTTER, paddingTop: space.lg },
  triageCard: { gap: space.sm, paddingBottom: 14, borderBottomWidth: RULE },
  triageImage: { width: '100%', aspectRatio: 4 / 3 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  triageActions: { paddingHorizontal: GUTTER, paddingVertical: space.lg, gap: space.sm },
  bigTag: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  rediscover: { borderTopWidth: 2, borderBottomWidth: RULE, paddingTop: space.sm, paddingBottom: space.xs, gap: space.md },
  rediscoverHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginRight: -space.sm },
  thumbs: { flexDirection: 'row', gap: space.sm },
  thumb: { flex: 1, aspectRatio: 1, overflow: 'hidden', justifyContent: 'center' },
  thumbText: { padding: space.sm, fontFamily: BRAND_FONT },
  shuffle: { minHeight: TOUCH, marginTop: -space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' },
});
