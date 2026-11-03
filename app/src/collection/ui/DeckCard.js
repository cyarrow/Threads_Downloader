import { memo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cardStill } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { icon, space, useCollectionTheme } from '../tokens';
import { DateImprint, PhotoBack, PrintLabel, TagMark } from './theme';

const RULE = StyleSheet.hairlineWidth * 2;
// 底片 text card: where its words start, so the page's ruled lines meet theirs.
const BACK_TOP = space.xl;
const BACK_SIDE = space.xl;

// Ruled lines down the whole back of the photo (PhotoBack only rules the lines
// its text fills; on a deck card that would leave most of the paper blank).
function PageRules({ lineHeight, color }) {
  const [height, setHeight] = useState(0);
  const count = Math.max(0, Math.floor((height - BACK_TOP) / lineHeight));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.rule, { top: BACK_TOP + (i + 1) * lineHeight - RULE, backgroundColor: color }]} />
      ))}
    </View>
  );
}

function shortDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// One card of the 翻翻 deck.
// 雜誌: a sheet of `card` paper with a hairline edge, the picture filling the top
// (nothing printed on it), then kicker, two lines of the post in WenKai and a
// meta line. A text-only post fills the top with its tag-tinted page instead.
// 底片: the card is a print — the photo inset in a paper edge (t.edge, light in
// both schemes) with the date imprint and ▶ 影片 / N 張 on it, and the kicker,
// words and meta printed on the edge in onEdge / onEdgeMuted. A text-only post is
// the back of a photo (PhotoBack): the whole card is the ruled paper and its
// words use the paper's own onPaper / onPaperMuted.
// `likeOpacity` / `nopeOpacity`: Animated values from the drag. The stamps are
// opaque theme-coloured labels (background fill + ink / accent text), so they
// read the same on any photo and in both schemes.
// `likeLabel`: 「精選」 normally, 「＋ 美食」 when sorting 未分類.
function DeckCardImpl({ post, index, likeLabel, likeIcon = 'heart', nopeLabel = '下一張', likeOpacity, nopeOpacity }) {
  const t = useCollectionTheme();
  const film = t.printFrame;
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const s = t.tag(hue);
  const still = cardStill(post);
  const first = post.media[0];
  const kind = first ? (first.type === 'video' ? '影片' : post.media.length > 1 ? `${post.media.length} 張` : null) : null;
  const printKind = first ? (first.type === 'video' ? 'video' : post.media.length > 1 ? 'multi' : null) : null;

  // The surface under the words below the art, and the text colours that belong to it.
  const surface = !film ? t.card : still ? t.edge : s.paper;
  const ink = !film ? t.foreground : still ? t.onEdge : s.onPaper;
  const inkMuted = !film ? t.mutedForeground : still ? t.onEdgeMuted : s.onPaperMuted;
  const featuredColor = film ? ink : t.accent;
  const nameColor = film ? inkMuted : tags[0] ? s.text : t.mutedForeground;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface, borderRadius: t.radius.xs },
        film ? [styles.print, still && styles.printEdge] : { borderColor: t.border },
      ]}
    >
      {/* No touch targets inside the art: on web this also keeps the browser from
          starting a native image drag instead of the swipe. */}
      <View pointerEvents="none" style={[styles.art, { backgroundColor: still || !film ? t.muted : s.paper }]}>
        {still ? (
          <>
            <Image source={still} recyclingKey={post.id} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
            {film && <PrintLabel kind={printKind} count={post.media.length} />}
            {film && (
              <View style={styles.imprint}>
                <DateImprint at={post.savedAt} />
              </View>
            )}
          </>
        ) : film ? (
          <>
            {!!s.paperRule && <PageRules lineHeight={t.font.quote.lineHeight} color={s.paperRule} />}
            <PhotoBack hue={hue} text={post.caption} textStyle={t.font.quote} numberOfLines={12} style={styles.back} />
          </>
        ) : (
          <View style={[styles.page, { backgroundColor: s.paper }]}>
            <Text style={[t.font.quote, styles.mark, { color: s.mark }]} importantForAccessibility="no">
              「
            </Text>
            <Text style={[t.font.quote, { color: s.onPaper }]} numberOfLines={12}>
              {post.caption}
            </Text>
          </View>
        )}
        {likeOpacity && (
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.stamp, styles.like, { opacity: likeOpacity, backgroundColor: t.background, borderColor: t.accent, borderRadius: t.radius.sm }]}
          >
            <Text style={[t.font.headline, { color: t.accent }]}>{likeLabel}</Text>
            {likeIcon && <Ionicons name={likeIcon} size={icon.md} color={t.accent} />}
          </Animated.View>
        )}
        {nopeOpacity && (
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.stamp, styles.nope, { opacity: nopeOpacity, backgroundColor: t.background, borderColor: t.foreground, borderRadius: t.radius.sm }]}
          >
            <Text style={[t.font.headline, { color: t.foreground }]}>{nopeLabel}</Text>
          </Animated.View>
        )}
      </View>
      <View style={[styles.info, film && styles.infoFilm]}>
        <View style={styles.row}>
          {post.featured && <Text style={[t.font.kicker, { color: featuredColor }]}>精選</Text>}
          <TagMark hue={hue} size="sm" />
          <Text style={[t.font.kicker, styles.flex, { color: nameColor }]} numberOfLines={1}>
            {tags[0] ? tagLabel(tags[0], index.byId) : '未分類'}
            {tags.length > 1 ? ` +${tags.length - 1}` : ''}
          </Text>
        </View>
        {!!still && !!post.caption && (
          <Text style={[t.font.card, { color: ink }]} numberOfLines={2}>
            {post.caption}
          </Text>
        )}
        <View style={styles.row}>
          <Text style={[t.font.caption, styles.flex, { color: inkMuted }]} numberOfLines={1}>
            @{post.author}
          </Text>
          {/* 底片 prints say ▶ 影片 / N 張 on the photo itself. */}
          {kind && !film && (
            <View style={styles.item}>
              {first?.type === 'video' && <Ionicons name="play" size={11} color={inkMuted} />}
              <Text style={[t.font.caption, { color: inkMuted }]}>{kind}</Text>
            </View>
          )}
          <Text style={[t.font.caption, { color: inkMuted }]}>收藏於 {shortDate(post.savedAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export const DeckCard = memo(DeckCardImpl);

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  // 底片: no hairline; a soft shadow lifts the print off the page.
  print: { borderWidth: 0, boxShadow: '0px 2px 6px rgba(0,0,0,0.25)' },
  printEdge: { paddingTop: 8, paddingHorizontal: 8 },
  art: { flex: 1, minHeight: 0, overflow: 'hidden' },
  page: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg, overflow: 'hidden' },
  // Transparent so the page's rules (drawn under it) show; the art is the paper.
  back: { flex: 1, boxShadow: 'none', backgroundColor: 'transparent', paddingHorizontal: BACK_SIDE, paddingTop: BACK_TOP },
  rule: { position: 'absolute', left: BACK_SIDE, right: BACK_SIDE, height: RULE },
  mark: { fontSize: 48, lineHeight: 56, marginLeft: -16, marginBottom: -12, marginTop: space.sm },
  imprint: { position: 'absolute', right: 10, bottom: 8 },
  info: { padding: space.lg, paddingTop: space.md, gap: 6 },
  infoFilm: { paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1 },
  stamp: {
    position: 'absolute',
    top: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  like: { left: space.lg, transform: [{ rotate: '-10deg' }] },
  nope: { right: space.lg, transform: [{ rotate: '10deg' }] },
});
