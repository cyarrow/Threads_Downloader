import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cardStill } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { font, icon, radius, space, tagColors, tagTint, useCollectionTheme } from '../tokens';
import { PressScale } from './base';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Skeleton() {
  const t = useCollectionTheme();
  return (
    <View style={styles.stack}>
      <View style={[styles.skeletonMedia, { backgroundColor: t.muted }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '40%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '90%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '60%' }]} />
      <Text style={[font.meta, { color: t.mutedForeground }]}>讀取中…</Text>
    </View>
  );
}

// Section label above the text, like a magazine column heading: the tag's colour
// as a small square plus its name. Featured cards also say 精選 and show the full
// 大標籤 › 小標籤 path.
function Kicker({ post, tags, hue, index }) {
  const t = useCollectionTheme();
  const c = tagColors(hue, t.scheme, false);
  const name = tags[0] ? (post.featured ? tagLabel(tags[0], index.byId) : tags[0].name) : '未分類';
  return (
    <View style={styles.row}>
      {post.featured && <Text style={[font.kicker, { color: t.accent }]}>精選</Text>}
      <View style={[styles.square, { backgroundColor: c.dot }]} />
      <Text style={[font.kicker, styles.flex, { color: tags[0] ? c.text : t.mutedForeground }]} numberOfLines={1}>
        {name}
        {tags.length > 1 ? ` +${tags.length - 1}` : ''}
      </Text>
    </View>
  );
}

// Sans meta line closing the card: what the old photo badges said, as words.
function Meta({ post, kind }) {
  const t = useCollectionTheme();
  const muted = { color: t.mutedForeground };
  return (
    <View style={styles.row}>
      <Text style={[font.caption, styles.flex, muted]} numberOfLines={1}>
        @{post.author}
      </Text>
      {kind && (
        <View style={styles.item}>
          {post.media[0]?.type === 'video' && <Ionicons name="play" size={11} color={t.mutedForeground} />}
          <Text style={[font.caption, muted]}>{kind}</Text>
        </View>
      )}
      {post.status === 'sourceDeleted' && (
        <View style={styles.item}>
          <Ionicons name="cloud-offline-outline" size={13} color={t.mutedForeground} />
          <Text style={[font.caption, muted]}>已刪除</Text>
        </View>
      )}
      {post.downloaded && (
        <View style={styles.item}>
          <Ionicons name="arrow-down-circle-outline" size={13} color={t.mutedForeground} />
          <Text style={[font.caption, muted]}>已下載</Text>
        </View>
      )}
    </View>
  );
}

// One saved post on the wall, in the 雜誌 style (design-system/threads-collection):
// no card box and nothing printed over the photo — image, kicker, up to three
// lines of the post in WenKai, a meta line, then a hairline rule. Text-only posts
// become a tag-tinted page that opens with a large 「. Featured posts span the row.
// `wide`: the wall is in its 3-column (tablet / landscape) layout, where a
// full-row featured card needs a flatter image to stay within the screen.
// `maxMediaHeight` keeps any one image from filling a short (landscape) screen.
function PostCardImpl({ post, index, onPress, onLongPress, onRetry, wide, maxMediaHeight }) {
  const t = useCollectionTheme();
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const first = post.media[0];
  const still = cardStill(post);
  const visual = !!(first || still);
  const rule = { borderBottomColor: t.border };

  if (post.status === 'loading') {
    return (
      <View style={[styles.wrap, rule]} accessibilityLabel="讀取中的收藏">
        <Skeleton />
      </View>
    );
  }

  if (post.status === 'failed') {
    return (
      <View style={[styles.failed, { borderColor: t.border }]}>
        <Ionicons name="alert-circle" size={icon.lg} color={t.danger} />
        <Text style={[font.label, { color: t.foreground }]}>{post.error === 'login' ? '需要登入 Threads' : '讀取失敗'}</Text>
        <Text style={[font.meta, { color: t.mutedForeground, textAlign: 'center' }]} numberOfLines={2}>
          {post.author ? `@${post.author}` : post.url.replace(/^https:\/\/www\./, '')}
        </Text>
        <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
          <Text style={[font.label, { color: t.accent }]}>重試</Text>
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
    post.status === 'sourceDeleted' && '原貼文已刪除',
    post.downloaded && '已下載',
  ].filter(Boolean).join('，');
  const metaKind = first ? (first.type === 'video' ? '影片' : post.media.length > 1 ? `${post.media.length} 張` : null) : null;

  return (
    <PressScale
      onPress={onPress}
      onLongPress={onLongPress}
      delayPressIn
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="長按可設為精選、編輯標籤或刪除"
      style={[styles.wrap, rule]}
    >
      {visual ? (
        // recyclingKey: the list reuses card views while scrolling; without it a
        // recycled card briefly shows the previous post's image.
        <Image
          source={still}
          recyclingKey={post.id}
          style={[styles.media, { aspectRatio: 1 / ratio, maxHeight: maxMediaHeight, backgroundColor: t.muted }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <View style={[styles.page, { backgroundColor: tagTint(hue, t.scheme, t.card) }]}>
          <Text style={[font.quote, styles.mark, { color: tagColors(hue, t.scheme, false).dot }]} importantForAccessibility="no">
            「
          </Text>
          <Text style={[post.featured ? font.cardFeatured : font.quote, { color: t.foreground }]} numberOfLines={8}>
            {post.caption}
          </Text>
        </View>
      )}
      <Kicker post={post} tags={tags} hue={hue} index={index} />
      {visual && !!post.caption && (
        <Text style={[post.featured ? font.cardFeatured : font.card, { color: t.foreground }]} numberOfLines={3}>
          {post.caption}
        </Text>
      )}
      <Meta post={post} kind={metaKind} />
    </PressScale>
  );
}

export const PostCard = memo(PostCardImpl);

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  stack: { gap: space.sm },
  media: { width: '100%', borderRadius: radius.xs, marginBottom: 2 },
  page: { borderRadius: radius.xs, paddingHorizontal: space.md, paddingBottom: space.md, marginBottom: 2 },
  mark: { fontSize: 40, lineHeight: 48, marginLeft: -14, marginBottom: -10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  square: { width: 8, height: 8, borderRadius: 1 },
  flex: { flex: 1 },
  skeletonMedia: { width: '100%', aspectRatio: 1, borderRadius: radius.xs },
  skeletonLine: { height: 12, borderRadius: 2 },
  failed: {
    alignItems: 'center',
    padding: space.lg,
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.xs,
  },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
