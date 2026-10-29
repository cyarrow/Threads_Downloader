import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tagHue, tagLabel } from '../tagModel';
import { font, icon, radius, space, tagColors, useCollectionTheme } from '../tokens';
import { PressScale, TagChip } from './base';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Badge({ iconName, label }) {
  const t = useCollectionTheme();
  return (
    <View style={[styles.badge, { backgroundColor: t.badge }]}>
      {iconName && <Ionicons name={iconName} size={12} color={t.onBadge} />}
      {label && <Text style={[font.caption, { color: t.onBadge }]}>{label}</Text>}
    </View>
  );
}

function Avatar({ author, hue }) {
  const t = useCollectionTheme();
  const c = tagColors(hue, t.scheme, false);
  return (
    <View style={[styles.avatar, { backgroundColor: c.bg }]} importantForAccessibility="no-hide-descendants">
      <Text style={[font.caption, { color: c.text }]}>{author.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function Skeleton() {
  const t = useCollectionTheme();
  return (
    <View>
      <View style={[styles.skeletonMedia, { backgroundColor: t.muted }]} />
      <View style={styles.body}>
        <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '90%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: t.muted, width: '60%' }]} />
        <Text style={[font.meta, { color: t.mutedForeground }]}>讀取中…</Text>
      </View>
    </View>
  );
}

// One saved post on the wall. Variants follow design-system/threads-collection:
// media card, quote card (text-only, serif), and featured (full-row) card.
// `wide`: the wall is in its 3-column (tablet / landscape) layout, where a
// full-row featured card needs a flatter image to stay within the screen.
// `maxMediaHeight` keeps any one image from filling a short (landscape) screen.
function PostCardImpl({ post, index, onPress, onLongPress, onRetry, wide, maxMediaHeight }) {
  const t = useCollectionTheme();
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const first = post.media[0];
  const quote = !first && post.status !== 'loading' && post.status !== 'failed';

  if (post.status === 'loading') {
    return (
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]} accessibilityLabel="讀取中的收藏">
        <Skeleton />
      </View>
    );
  }

  if (post.status === 'failed') {
    return (
      <View style={[styles.card, styles.failed, { backgroundColor: t.card, borderColor: t.border }]}>
        <Ionicons name="alert-circle" size={icon.lg} color={t.danger} />
        <Text style={[font.label, { color: t.foreground }]}>讀取失敗</Text>
        <Text style={[font.meta, { color: t.mutedForeground }]}>@{post.author}</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
          <Text style={[font.label, { color: t.accent }]}>重試</Text>
        </Pressable>
      </View>
    );
  }

  const ratio = first
    ? post.featured
      ? wide
        ? clamp(first.ratio, 0.3, 0.45)
        : clamp(first.ratio, 0.5, 0.75)
      : clamp(first.ratio, 0.75, 1.6)
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

  return (
    <PressScale
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="長按可設為精選、編輯標籤或刪除"
      style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}
    >
      {first && (
        <View>
          <Image
            source={first.image}
            style={[styles.media, { aspectRatio: 1 / ratio, maxHeight: maxMediaHeight, backgroundColor: t.muted }]}
            contentFit="cover"
            transition={150}
            accessible={false}
          />
          <View style={styles.badgesTop}>
            <View style={styles.badgeRow}>
              {post.featured && <Badge iconName="star" label="精選" />}
              {first.type === 'video' && <Badge iconName="play" />}
            </View>
            {post.media.length > 1 && <Badge label={`1/${post.media.length}`} />}
          </View>
          <View style={styles.badgesBottom}>
            {post.status === 'sourceDeleted' ? <Badge iconName="cloud-offline-outline" label="已刪除" /> : <View />}
            {post.downloaded && <Badge iconName="download-outline" />}
          </View>
        </View>
      )}
      <View style={styles.body}>
        {quote && post.featured && (
          <View style={styles.badgeRow}>
            <TagChip variant="display" neutral label="★ 精選" />
          </View>
        )}
        {quote ? (
          <View style={[styles.quoteBar, { borderLeftColor: tagColors(hue, t.scheme, false).dot }]}>
            <Text style={[font.quote, { color: t.foreground }]} numberOfLines={8}>
              {post.caption}
            </Text>
          </View>
        ) : (
          !!post.caption && (
            <Text style={[post.featured ? font.headline : font.card, { color: t.foreground }]} numberOfLines={post.featured ? 3 : 2}>
              {post.caption}
            </Text>
          )
        )}
        <View style={styles.author}>
          <Avatar author={post.author} hue={hue} />
          <Text style={[font.meta, styles.authorText, { color: t.mutedForeground }]} numberOfLines={1}>
            @{post.author}
          </Text>
          {!first && post.downloaded && <Ionicons name="download-outline" size={icon.sm} color={t.mutedForeground} />}
        </View>
        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.slice(0, 2).map((tg) => (
              <TagChip
                key={tg.id}
                variant="display"
                hue={tagHue(tg, index.byId)}
                label={post.featured ? tagLabel(tg, index.byId) : tg.name}
              />
            ))}
            {tags.length > 2 && <TagChip variant="display" neutral label={`+${tags.length - 2}`} />}
          </View>
        )}
      </View>
    </PressScale>
  );
}

export const PostCard = memo(PostCardImpl);

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  media: { width: '100%' },
  body: { padding: space.md, gap: space.sm },
  badgesTop: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between' },
  badgesBottom: { position: 'absolute', bottom: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between' },
  badgeRow: { flexDirection: 'row', gap: space.xs },
  badge: {
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  quoteBar: { borderLeftWidth: 3, paddingLeft: space.sm },
  author: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorText: { flex: 1 },
  avatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  skeletonMedia: { width: '100%', aspectRatio: 1 },
  skeletonLine: { height: 12, borderRadius: 6 },
  failed: { alignItems: 'center', padding: space.lg, gap: space.xs },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
