import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardStill } from '../media';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { ScreenHeader } from './HeaderActions';
import { TagChip } from './base';
import { PhotoBack, Print, TagMark } from './theme';

const GUTTER = 20;
const COL_GAP = space.lg;
const RULE = StyleSheet.hairlineWidth * 2;
// PhotoBack's own height besides its text lines: paddings, gap and date line.
const PHOTO_BACK_CHROME = 14 + 10 + 8 + 14;
// 底片: how far the print underneath shows past the top one (right and top).
const STACK = 4;

// A 大標籤 as a magazine section cover: its newest picture (or, for a family of
// text posts, the newest post's words on the tag's paper), then the name with
// its colour marker, the count and the 小標籤 names.
// 底片: the picture is a print (paper edge, date imprint) lying on a second print,
// like a small stack; a text family shows the back of a photo (PhotoBack).
function Cover({ summary, width, onPress }) {
  const t = useCollectionTheme();
  const { tag, count, cover, latest, kids } = summary;
  const s = t.tag(tag.color);
  const still = cover && cardStill(cover);
  const kidNames = kids.map((k) => k.name).join('・');
  const film = t.printFrame;
  let art;
  if (!film) {
    art = (
      <View style={[styles.art, { borderRadius: t.radius.xs, backgroundColor: still ? t.muted : latest ? s.paper : t.muted }]}>
        {still ? (
          <Image source={still} recyclingKey={cover.id} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
        ) : latest ? (
          <Text style={[t.font.card, styles.artText, { color: s.onPaper }]} numberOfLines={7}>
            {latest.caption}
          </Text>
        ) : (
          <Ionicons name="pricetag-outline" size={28} color={t.mutedForeground} />
        )}
      </View>
    );
  } else if (still) {
    art = (
      <View style={styles.stack}>
        <View style={[styles.behind, { backgroundColor: t.edge, borderColor: t.border }]} />
        <Print savedAt={cover.savedAt}>
          <View style={[styles.photo, { backgroundColor: t.muted }]}>
            <Image source={still} recyclingKey={cover.id} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
          </View>
        </Print>
      </View>
    );
  } else if (latest) {
    // Fit whole ruled lines into the 4:5 back above its date line.
    const lines = Math.max(2, Math.floor(((width - STACK) * 1.25 - PHOTO_BACK_CHROME) / t.font.card.lineHeight));
    art = (
      <View style={styles.stack}>
        <View style={[styles.behind, { backgroundColor: s.paper, borderColor: t.border }]} />
        <PhotoBack hue={tag.color} text={latest.caption} savedAt={latest.savedAt} textStyle={t.font.card} numberOfLines={lines} style={styles.back} />
      </View>
    );
  } else {
    art = (
      <View style={[styles.art, { backgroundColor: t.muted, borderRadius: t.radius.xs }]}>
        <Ionicons name="pricetag-outline" size={28} color={t.mutedForeground} />
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tag.name}，${count} 篇${kidNames ? `，小標籤：${kidNames}` : ''}`}
      style={({ pressed }) => [styles.cover, { width, opacity: pressed ? 0.8 : 1 }]}
    >
      {art}
      <View style={styles.name}>
        {t.marker === 'bar' ? <TagMark hue={tag.color} size="md" /> : <View style={[styles.square, { backgroundColor: s.mark }]} />}
        <Text style={[t.font.title, styles.flex, { color: t.foreground }]} numberOfLines={1}>
          {tag.name}
        </Text>
      </View>
      <Text style={[t.font.caption, styles.count, { color: t.mutedForeground }]}>{count} 篇</Text>
      {!!kidNames && (
        <Text style={[t.font.meta, { color: t.mutedForeground }]} numberOfLines={1}>
          {kidNames}
        </Text>
      )}
    </Pressable>
  );
}

// 所有標籤: every 大標籤 as a cover in two columns (three on wide screens), with
// the 整理未分類 entry on top and 編輯 (the tag manager) in the header.
export function TagBrowser({ summaries, untagged, onBack, onOpenTag, onTriage, onEdit }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = width >= 600 ? 3 : 2;
  const coverWidth = Math.floor((width - GUTTER * 2 - COL_GAP * (columns - 1)) / columns);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxl }}>
      <View style={styles.header}>
        <ScreenHeader
          title="所有標籤"
          onBack={onBack}
          backLabel="返回收藏"
          right={
            <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="編輯標籤" style={styles.textButton}>
              <Text style={[t.font.label, { color: t.accent }]}>編輯</Text>
            </Pressable>
          }
        />
      </View>
      <View style={[styles.triage, { borderColor: t.border }]}>
        <Text style={[t.font.body, styles.flex, { color: t.foreground }]}>
          {untagged ? `${untagged} 篇還沒有標籤` : '每一篇都有標籤了'}
        </Text>
        {untagged > 0 && (
          <Pressable
            onPress={onTriage}
            accessibilityRole="button"
            style={({ pressed }) => [styles.outlined, { borderColor: t.outline, borderRadius: t.radius.sm, opacity: pressed ? 0.75 : 1 }]}
          >
            <Ionicons name="albums-outline" size={icon.sm} color={t.foreground} />
            <Text style={[t.font.label, { color: t.foreground }]}>整理未分類</Text>
          </Pressable>
        )}
      </View>
      {summaries.length === 0 ? (
        <Text style={[t.font.body, styles.none, { color: t.mutedForeground }]}>還沒有標籤。收藏貼文時可以新增。</Text>
      ) : (
        <View style={styles.grid}>
          {summaries.map((s) => (
            <Cover key={s.tag.id} summary={s} width={coverWidth} onPress={() => onOpenTag(s.tag.id)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// Header area of one tag's page (rendered by the wall above its cards): count,
// 「用串流看 ›」, and the 小標籤 as one scrolling row (全部 + each 小標籤).
export function TagPageBar({ tag, kids, count, child, onChild, onStream }) {
  const t = useCollectionTheme();
  const hue = tag.color;
  return (
    <View style={styles.pageBar}>
      <View style={styles.pageMeta}>
        <Text style={[t.font.meta, styles.flex, { color: t.mutedForeground }]} accessibilityLiveRegion="polite">
          {count} 篇{kids.length ? ` · ${kids.length} 個小標籤` : ''}
        </Text>
        <Pressable onPress={onStream} accessibilityRole="button" accessibilityLabel={`用串流看「${tag.name}」`} style={styles.textButton}>
          <Text style={[t.font.label, { color: t.accent }]}>用串流看</Text>
          <Ionicons name="chevron-forward" size={icon.sm} color={t.accent} />
        </Pressable>
      </View>
      {kids.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="小標籤"
          style={{ marginHorizontal: -GUTTER }}
          contentContainerStyle={styles.kidRow}
        >
          <TagChip neutral label="全部" selected={!child} onPress={() => onChild(null)} />
          {kids.map((k) => (
            <TagChip key={k.id} hue={hue} label={k.name} selected={child === k.id} onPress={() => onChild(child === k.id ? null : k.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: GUTTER, marginLeft: -space.md },
  textButton: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: space.sm },
  triage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: GUTTER,
    marginTop: space.sm,
    marginBottom: space.lg,
    paddingVertical: space.md,
    borderTopWidth: RULE,
    borderBottomWidth: RULE,
  },
  outlined: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, paddingHorizontal: space.md },
  none: { paddingHorizontal: GUTTER },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: COL_GAP, rowGap: space.xl, paddingHorizontal: GUTTER },
  cover: { gap: space.xs },
  art: { width: '100%', aspectRatio: 4 / 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  stack: { marginTop: STACK, marginRight: STACK, marginBottom: space.xs },
  behind: { position: 'absolute', top: -STACK, right: -STACK, bottom: STACK, left: STACK, borderWidth: StyleSheet.hairlineWidth * 2 },
  photo: { width: '100%', aspectRatio: 4 / 5 },
  back: { aspectRatio: 4 / 5, overflow: 'hidden', justifyContent: 'space-between' },
  artText: { padding: space.md, alignSelf: 'stretch' },
  name: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  square: { width: 10, height: 10, borderRadius: 1 },
  count: { letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  pageBar: { gap: space.xs },
  pageMeta: { flexDirection: 'row', alignItems: 'center', marginRight: -space.sm },
  kidRow: { gap: space.sm, paddingHorizontal: GUTTER, paddingVertical: (TOUCH - 36) / 2 },
});
