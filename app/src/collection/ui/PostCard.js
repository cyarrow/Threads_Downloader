import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { failureLabel } from '../fetchHealth';
import { cardStill } from '../media';
import { noteFirstLine } from '../noteModel';
import { tagHue, tagLabel } from '../tagModel';
import { icon, space, useCollectionTheme } from '../tokens';
import { PressScale } from './base';
import { NoteLine } from './Notes';
import { PhotoBack, Print, TagKicker } from './theme';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Skeleton() {
  const t = useCollectionTheme();
  return (
    <View style={styles.stack}>
      <View style={[styles.skeletonMedia, { backgroundColor: t.muted, borderRadius: t.radius.xs }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '40%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '90%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '60%' }]} />
      <Text style={[t.font.meta, { color: t.mutedForeground }]}>讀取中…</Text>
    </View>
  );
}

// Section label above the text, like a magazine column heading: the tag's marker
// plus its name. Featured cards also say 精選 and show the full 大標籤 › 小標籤 path.
function Kicker({ post, tags, hue, index }) {
  const name = tags[0] ? (post.featured ? tagLabel(tags[0], index.byId) : tags[0].name) : '未分類';
  const more = tags.length > 1 ? ` +${tags.length - 1}` : '';
  return <TagKicker hue={hue} featured={post.featured} untagged={!tags[0]} label={name + more} />;
}

// Sans meta line closing the card: what the old photo badges said, as words.
// 底片 prints say ▶ 影片 / N 張 on the photo and the author on a text card's back,
// so there the line only carries status (已刪除, 已下載), and only when there is one.
function Meta({ post, kind }) {
  const t = useCollectionTheme();
  const muted = { color: t.mutedForeground };
  const film = t.printFrame;
  if (film && post.status !== 'sourceDeleted' && !post.downloaded) return null;
  return (
    <View style={styles.row}>
      {film ? (
        <View style={styles.flex} />
      ) : (
        <Text style={[t.font.caption, styles.flex, muted]} numberOfLines={1}>
          @{post.author}
        </Text>
      )}
      {kind && !film && (
        <View style={styles.item}>
          {post.media[0]?.type === 'video' && <Ionicons name="play" size={11} color={t.mutedForeground} />}
          <Text style={[t.font.caption, muted]}>{kind}</Text>
        </View>
      )}
      {post.status === 'sourceDeleted' && (
        <View style={styles.item}>
          <Ionicons name="cloud-offline-outline" size={13} color={t.mutedForeground} />
          <Text style={[t.font.caption, muted]}>已刪除</Text>
        </View>
      )}
      {post.downloaded && (
        <View style={styles.item}>
          <Ionicons name="arrow-down-circle-outline" size={13} color={t.mutedForeground} />
          <Text style={[t.font.caption, muted]}>已下載</Text>
        </View>
      )}
    </View>
  );
}

// One saved post on the wall (design-system/threads-collection). 雜誌: no card box
// and nothing printed over the photo — image, kicker, up to three lines of the
// post in WenKai, a meta line, then a hairline rule; text-only posts become a
// tag-tinted page that opens with a large 「. 底片: the photo is a print (paper
// edge, date imprint, ▶ 影片 / N 張), no rule, two lines of text; text-only posts
// are the back of a photo (PhotoBack). Featured posts span the row.
// The user's note (個人筆記) shows as one line: 雜誌 — pencil + first line above
// the meta line; 底片 — handwritten on the print's bottom edge, or in pencil on
// the photo's back for a text-only post.
// `wide`: the wall is in its 3-column (tablet / landscape) layout, where a
// full-row featured card needs a flatter image to stay within the screen.
// `maxMediaHeight` keeps any one image from filling a short (landscape) screen.
// `onOpen(post)` / `onMenu(post)` / `onRetry(post)`: tap, long press, 重試. They
// take the post so the wall can pass the same functions to every card and memo
// skips cards whose post didn't change.
// Posts already asked to be read again because their picture didn't load.
const reported = new Set();

function PostCardImpl({ post, index, onOpen, onMenu, onRetry, onStale, wide, maxMediaHeight }) {
  const t = useCollectionTheme();
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const first = post.media[0];
  const still = cardStill(post);
  const visual = !!(first || still);
  const rule = t.printFrame ? styles.unruled : { borderBottomColor: t.border };
  const note = noteFirstLine(post.note);

  if (post.status === 'loading') {
    return (
      <View style={[styles.wrap, rule]} accessibilityLabel="讀取中的收藏">
        <Skeleton />
      </View>
    );
  }

  if (post.status === 'failed') {
    return (
      <View style={[styles.failed, { borderColor: t.border, borderRadius: t.radius.xs }]}>
        <Ionicons name="alert-circle" size={icon.lg} color={t.danger} />
        <Text style={[t.font.label, { color: t.foreground }]}>{failureLabel(post.error)}</Text>
        <Text style={[t.font.meta, { color: t.mutedForeground, textAlign: 'center' }]} numberOfLines={2}>
          {post.author ? `@${post.author}` : post.url.replace(/^https:\/\/www\./, '')}
        </Text>
        <Pressable onPress={() => onRetry(post)} accessibilityRole="button" style={styles.retry}>
          <Text style={[t.font.label, { color: t.accent }]}>重試</Text>
        </Pressable>
      </View>
    );
  }

  const natural = first?.ratio || 1;
  const ratio = visual
    ? post.featured
      ? wide
        ? clamp(natural, 0.3, 0.45)
        : clamp(natural, 0.5, 0.75)
      : clamp(natural, 0.75, 1.6)
    : null;
  const kind = first ? (first.type === 'video' ? '影片' : post.media.length > 1 ? `${post.media.length} 張圖片` : '圖片') : '文字';
  const a11y = [
    post.featured && '精選',
    `@${post.author}`,
    kind,
    (post.caption || '').slice(0, 30),
    tags.length && `標籤：${tags.map((tg) => tg.name).join('、')}`,
    note && `我的筆記：${note.slice(0, 30)}`,
    post.status === 'sourceDeleted' && '原貼文已刪除',
    post.downloaded && '已下載',
  ].filter(Boolean).join('，');
  const metaKind = first ? (first.type === 'video' ? '影片' : post.media.length > 1 ? `${post.media.length} 張` : null) : null;
  const printKind = first ? (first.type === 'video' ? 'video' : post.media.length > 1 ? 'multi' : null) : null;

  return (
    <PressScale
      onPress={() => onOpen(post)}
      onLongPress={() => onMenu(post)}
      delayPressIn
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="長按可設為精選、編輯標籤或刪除"
      style={[styles.wrap, rule]}
    >
      {visual ? (
        <Print savedAt={post.savedAt} kind={printKind} count={post.media.length} note={note} style={styles.mediaGap}>
          {/* recyclingKey: the list reuses card views while scrolling; without it a
              recycled card briefly shows the previous post's image. */}
          <Image
            source={still}
            recyclingKey={post.id}
            style={[styles.media, { aspectRatio: 1 / ratio, maxHeight: maxMediaHeight, backgroundColor: t.muted }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            // The picture's link has expired (or its file is gone): read the post again.
            onError={() => {
              if (!onStale || reported.has(post.id)) return;
              reported.add(post.id);
              onStale(post);
            }}
            accessible={false}
          />
        </Print>
      ) : (
        <PhotoBack
          hue={hue}
          text={post.caption}
          savedAt={post.savedAt}
          author={post.author}
          textStyle={post.featured ? t.font.cardFeatured : t.font.quote}
          numberOfLines={8}
          note={note}
          style={styles.mediaGap}
        />
      )}
      <Kicker post={post} tags={tags} hue={hue} index={index} />
      {visual && !!post.caption && (
        <Text style={[post.featured ? t.font.cardFeatured : t.font.card, { color: t.foreground }]} numberOfLines={t.printFrame ? 2 : 3}>
          {post.caption}
        </Text>
      )}
      {!!note && !t.printFrame && <NoteLine text={note} />}
      <Meta post={post} kind={metaKind} />
    </PressScale>
  );
}

export const PostCard = memo(PostCardImpl);

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  unruled: { borderBottomWidth: 0, paddingBottom: 0 },
  stack: { gap: space.sm },
  media: { width: '100%' },
  mediaGap: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1 },
  skeletonMedia: { width: '100%', aspectRatio: 1 },
  skeletonLine: { height: 12, borderRadius: 2 },
  failed: {
    alignItems: 'center',
    padding: space.lg,
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
