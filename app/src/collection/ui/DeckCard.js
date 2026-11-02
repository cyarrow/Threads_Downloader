import { memo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cardStill } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { font, icon, radius, space, tagColors, tagTint, useCollectionTheme } from '../tokens';

function shortDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// One card of the 翻翻 deck (雜誌): a sheet of `card` paper with a hairline
// edge, the picture filling the top (nothing printed on it), then kicker, two
// lines of the post in WenKai and a meta line. A text-only post fills the top
// with its tag-tinted page instead.
// `likeOpacity` / `nopeOpacity`: Animated values from the drag. The stamps are
// opaque theme-coloured labels (background fill + ink / accent text), so they
// read the same on any photo and in both schemes.
// `likeLabel`: 「精選」 normally, 「＋ 美食」 when sorting 未分類.
function DeckCardImpl({ post, index, likeLabel, likeIcon = 'heart', nopeLabel = '下一張', likeOpacity, nopeOpacity }) {
  const t = useCollectionTheme();
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const hueColors = tagColors(hue, t.scheme, false);
  const still = cardStill(post);
  const first = post.media[0];
  const kind = first ? (first.type === 'video' ? '影片' : post.media.length > 1 ? `${post.media.length} 張` : null) : null;

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* No touch targets inside the art: on web this also keeps the browser from
          starting a native image drag instead of the swipe. */}
      <View pointerEvents="none" style={[styles.art, { backgroundColor: t.muted }]}>
        {still ? (
          <Image source={still} recyclingKey={post.id} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
        ) : (
          <View style={[styles.page, { backgroundColor: tagTint(hue, t.scheme, t.card) }]}>
            <Text style={[font.quote, styles.mark, { color: hueColors.dot }]} importantForAccessibility="no">
              「
            </Text>
            <Text style={[font.quote, { color: t.foreground }]} numberOfLines={12}>
              {post.caption}
            </Text>
          </View>
        )}
        {likeOpacity && (
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.stamp, styles.like, { opacity: likeOpacity, backgroundColor: t.background, borderColor: t.accent }]}
          >
            <Text style={[font.headline, { color: t.accent }]}>{likeLabel}</Text>
            {likeIcon && <Ionicons name={likeIcon} size={icon.md} color={t.accent} />}
          </Animated.View>
        )}
        {nopeOpacity && (
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.stamp, styles.nope, { opacity: nopeOpacity, backgroundColor: t.background, borderColor: t.foreground }]}
          >
            <Text style={[font.headline, { color: t.foreground }]}>{nopeLabel}</Text>
          </Animated.View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          {post.featured && <Text style={[font.kicker, { color: t.accent }]}>精選</Text>}
          <View style={[styles.square, { backgroundColor: hueColors.dot }]} />
          <Text style={[font.kicker, styles.flex, { color: tags[0] ? hueColors.text : t.mutedForeground }]} numberOfLines={1}>
            {tags[0] ? tagLabel(tags[0], index.byId) : '未分類'}
            {tags.length > 1 ? ` +${tags.length - 1}` : ''}
          </Text>
        </View>
        {!!still && !!post.caption && (
          <Text style={[font.card, { color: t.foreground }]} numberOfLines={2}>
            {post.caption}
          </Text>
        )}
        <View style={styles.row}>
          <Text style={[font.caption, styles.flex, { color: t.mutedForeground }]} numberOfLines={1}>
            @{post.author}
          </Text>
          {kind && (
            <View style={styles.item}>
              {first?.type === 'video' && <Ionicons name="play" size={11} color={t.mutedForeground} />}
              <Text style={[font.caption, { color: t.mutedForeground }]}>{kind}</Text>
            </View>
          )}
          <Text style={[font.caption, { color: t.mutedForeground }]}>收藏於 {shortDate(post.savedAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export const DeckCard = memo(DeckCardImpl);

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.xs, overflow: 'hidden' },
  art: { flex: 1, minHeight: 0 },
  page: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg, overflow: 'hidden' },
  mark: { fontSize: 48, lineHeight: 56, marginLeft: -16, marginBottom: -12, marginTop: space.sm },
  info: { padding: space.lg, paddingTop: space.md, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  square: { width: 8, height: 8, borderRadius: 1 },
  flex: { flex: 1 },
  stamp: {
    position: 'absolute',
    top: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 2,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  like: { left: space.lg, transform: [{ rotate: '-10deg' }] },
  nope: { right: space.lg, transform: [{ rotate: '10deg' }] },
});
