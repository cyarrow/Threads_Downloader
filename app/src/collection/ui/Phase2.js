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
import { TOUCH, font, icon, radius, space, tagColors, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet, TagChip } from './base';

function Page({ title, onClose, children, footer }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: t.border }]}>
          <IconButton name="arrow-back" label="返回" onPress={onClose} />
          <Text style={[font.title, styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
        {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, borderTopColor: t.border, backgroundColor: t.card }]}>{footer}</View>}
      </View>
    </Modal>
  );
}

// --- Tag manager ---------------------------------------------------------------

function TagEditSheet({ tag, index, counts, onClose, onRename, onRecolor, onMerge, onDelete }) {
  const t = useCollectionTheme();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('edit'); // edit | merge | confirmDelete
  const affected = counts[tag.id] || 0;
  const kids = index.children[tag.id] || [];
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
            <Text nativeID="tagNameLabel" style={[font.label, { color: t.foreground }]}>名稱</Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(null);
              }}
              accessibilityLabel="標籤名稱"
              accessibilityLabelledBy="tagNameLabel"
              style={[font.body, styles.input, { color: t.foreground, backgroundColor: t.field, borderColor: error ? t.danger : t.field }]}
            />
            {error && (
              <View style={styles.inline} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
                <Text style={[font.meta, { color: t.danger }]}>{error}</Text>
              </View>
            )}
            {!tag.parentId && (
              <>
                <Text style={[font.label, { color: t.foreground }]}>顏色（小標籤會一起換）</Text>
                <View style={styles.swatches}>
                  {TAG_HUES.filter((h) => h !== 'slate').map((h) => {
                    const c = tagColors(h, t.scheme, false);
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
                        <View style={[styles.swatch, { backgroundColor: c.dot, borderColor: on ? t.foreground : 'transparent' }]}>
                          {on && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <Text style={[font.meta, { color: t.mutedForeground }]}>
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
            <Text style={[font.body, { color: t.foreground }]}>
              把「{tag.name}」的 {affected} 篇貼文移到哪個標籤？{kids.length ? '它的小標籤會一起搬過去。' : ''}
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
            <Text style={[font.body, { color: t.foreground }]}>
              刪除「{tag.name}」{kids.length ? `和它的 ${kids.length} 個小標籤` : ''}？{affected} 篇貼文會拿掉這個標籤，貼文本身不會被刪除。
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

export function TagManager({ posts, index, onClose, onRename, onRecolor, onMerge, onDelete }) {
  const t = useCollectionTheme();
  const [editing, setEditing] = useState(null);
  const counts = useMemo(() => {
    const c = {};
    for (const p of posts) for (const id of p.tagIds) c[id] = (c[id] || 0) + 1;
    return c;
  }, [posts]);
  const editingTag = editing && index.byId[editing];

  const Row = ({ tag, child }) => (
    <Pressable
      onPress={() => setEditing(tag.id)}
      accessibilityRole="button"
      accessibilityHint="改名、換顏色、合併或刪除"
      style={({ pressed }) => [styles.tagRow, child && styles.tagRowChild, pressed && { backgroundColor: t.muted }]}
    >
      <View style={[styles.dot, { backgroundColor: tagColors(tagHue(tag, index.byId), t.scheme, false).dot }]} />
      <Text style={[font.body, { color: t.foreground, flex: 1 }]}>{tag.name}</Text>
      <Text style={[font.meta, { color: t.mutedForeground }]}>{counts[tag.id] || 0} 篇</Text>
      <Ionicons name="chevron-forward" size={icon.sm} color={t.mutedForeground} />
    </Pressable>
  );

  return (
    <Page title="標籤管理" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.list}>
        {index.parents.length === 0 && (
          <Text style={[font.body, { color: t.mutedForeground }]}>還沒有標籤。收藏貼文時可以新增。</Text>
        )}
        {index.parents.map((p) => (
          <View key={p.id} style={[styles.group, { backgroundColor: t.card, borderColor: t.border }]}>
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
          <Text style={[font.title, { color: t.foreground }]}>這次分類了 {done.tagged} 篇</Text>
          {done.skipped > 0 && <Text style={[font.body, { color: t.mutedForeground }]}>略過 {done.skipped} 篇，之後可以再整理</Text>}
          <PrimaryButton title="回到收藏" onPress={onClose} />
        </View>
      ) : post ? (
        <>
          <View style={[styles.progress, { backgroundColor: t.field }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: queue.length, now: pos }}>
            <View style={[styles.progressBar, { backgroundColor: t.foreground, width: `${(pos / queue.length) * 100}%` }]} />
          </View>
          <ScrollView contentContainerStyle={styles.triageBody}>
            <View style={[styles.triageCard, { backgroundColor: t.card, borderColor: t.border }]}>
              {still && <Image source={still} style={styles.triageImage} contentFit="cover" accessible={false} />}
              <View style={styles.triageText}>
                {!!post.caption && (
                  <Text style={[still ? font.card : font.quote, { color: t.foreground }]} numberOfLines={still ? 3 : 6}>
                    {post.caption}
                  </Text>
                )}
                <Text style={[font.meta, { color: t.mutedForeground }]}>@{post.author}</Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.triageActions}>
            {suggestions.map(({ tag, reasons }) => (
              <Pressable
                key={tag.id}
                onPress={() => {
                  onTag(post.id, [tag.id]);
                  next('tagged');
                }}
                accessibilityRole="button"
                accessibilityLabel={`放到 ${tagLabel(tag, index.byId)}，${reasonText(reasons)}`}
                style={({ pressed }) => [styles.bigTag, { backgroundColor: tagColors(tagHue(tag, index.byId), t.scheme, false).bg, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[font.headline, { color: tagColors(tagHue(tag, index.byId), t.scheme, false).text }]}>
                  {tagLabel(tag, index.byId)}
                </Text>
                <Text style={[font.meta, { color: tagColors(tagHue(tag, index.byId), t.scheme, false).text }]} numberOfLines={1}>
                  {reasonText(reasons)}
                </Text>
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
          <Text style={[font.body, { color: t.mutedForeground }]}>沒有需要整理的貼文。</Text>
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
    <View style={[styles.rediscover, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.rediscoverHead}>
        <Ionicons name="time-outline" size={icon.md} color={t.foreground} />
        <View style={styles.flex}>
          <Text style={[font.title, { color: t.foreground }]}>{pick.title}</Text>
          <Text style={[font.meta, { color: t.mutedForeground }]}>{pick.subtitle}</Text>
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
              style={[styles.thumb, { backgroundColor: t.muted }]}
            >
              {still ? (
                <Image source={still} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              ) : (
                <Text style={[font.meta, styles.thumbText, { color: t.foreground }]} numberOfLines={4}>
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
          <Text style={[font.label, { color: t.accent }]}>隨機翻翻</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  topTitle: { flex: 1, marginLeft: space.xs },
  footer: { borderTopWidth: StyleSheet.hairlineWidth * 2, padding: space.lg },
  list: { padding: space.lg, gap: space.md },
  group: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  tagRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  tagRowChild: { paddingLeft: space.xxl },
  dot: { width: 12, height: 12, borderRadius: 6 },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { gap: space.md, paddingBottom: space.md },
  input: { minHeight: TOUCH, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  swatchTarget: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  progress: { height: 4 },
  progressBar: { height: 4 },
  triageBody: { padding: space.lg },
  triageCard: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  triageImage: { width: '100%', aspectRatio: 4 / 3 },
  triageText: { padding: space.md, gap: space.sm },
  triageActions: { padding: space.lg, gap: space.sm },
  bigTag: { minHeight: 56, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm, justifyContent: 'center' },
  rediscover: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.md },
  rediscoverHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  thumbs: { flexDirection: 'row', gap: space.sm },
  thumb: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'center' },
  thumbText: { padding: space.xs },
  shuffle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' },
});
