import { memo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cardStill, imageSource } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, font, icon, radius, space, tagColors, tagTint, useCollectionTheme } from '../tokens';
import { TagChip } from './base';
import { MediaPager } from './PostDetail';

const GUTTER = 20;
const RULE = StyleSheet.hairlineWidth * 2;

function shortDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// A quiet action under a stream post: icon + words, no box (a feed shows many of
// these; boxed buttons would outweigh the posts and wrap on a 360dp screen).
function Action({ iconName, label, onPress }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={iconName} size={icon.md} color={t.foreground} />
      <Text style={[font.label, { color: t.foreground }]}>{label}</Text>
    </Pressable>
  );
}

// One post in the 串流 tab, read like a Threads post in the 雜誌 style: kicker,
// byline, the whole caption (never truncated), then the media full width — the
// same pager as the detail page (swipe, page marks, counter, tap-to-play with
// one video at a time app-wide) — its tags (tap → filter the feed) and actions.
// `active`: false once the post scrolls out of view, which stops its video.
function StreamPostImpl({ post, index, width, active, onTag, onAction, onStale }) {
  const t = useCollectionTheme();
  const staleOnce = useRef(false);
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const hueColors = tagColors(hue, t.scheme, false);
  const still = cardStill(post);
  const deleted = post.status === 'sourceDeleted';
  const act = (kind) => () => onAction(kind, post);
  const reportStale = () => {
    if (staleOnce.current) return;
    staleOnce.current = true;
    onStale?.(post);
  };

  return (
    <View style={[styles.post, { borderBottomColor: t.border }]}>
      <View style={styles.text}>
        <View style={styles.kicker}>
          {post.featured && <Text style={[font.kicker, { color: t.accent }]}>精選</Text>}
          <View style={[styles.square, { backgroundColor: hueColors.dot }]} />
          <Text style={[font.kicker, styles.flex, { color: tags[0] ? hueColors.text : t.mutedForeground }]} numberOfLines={1}>
            {tags[0] ? tagLabel(tags[0], index.byId) : '未分類'}
          </Text>
        </View>
        <View>
          <Text style={[font.headline, { color: t.foreground }]} numberOfLines={1}>
            <Text style={[font.label, { color: t.mutedForeground }]}>文 ／ </Text>@{post.author}
          </Text>
          <Text style={[font.caption, styles.dateline, { color: t.mutedForeground }]}>
            收藏於 {shortDate(post.savedAt)}
            {deleted ? ' · 原貼文已刪除' : ''}
          </Text>
        </View>
        {!!post.caption &&
          (post.media.length || still ? (
            <Text style={[font.content, { color: t.foreground }]} selectable>
              {post.caption}
            </Text>
          ) : (
            // Text-only post: the same tag-tinted page as its card and detail page.
            <View style={[styles.page, { backgroundColor: tagTint(hue, t.scheme, t.card) }]}>
              <Text style={[font.quote, styles.mark, { color: hueColors.dot }]} importantForAccessibility="no" accessibilityElementsHidden>
                「
              </Text>
              <Text style={[font.quote, { color: t.foreground }]} selectable>
                {post.caption}
              </Text>
            </View>
          ))}
      </View>

      {post.media.length > 0 ? (
        // Keyed by post so a recycled cell never inherits another post's page or player.
        <MediaPager key={post.id} media={post.media} width={width} placeholder={imageSource(post.cover)} onStale={reportStale} active={active} />
      ) : (
        still && (
          <Image
            source={still}
            recyclingKey={post.id}
            style={{ width, height: width, backgroundColor: t.muted }}
            contentFit="contain"
            accessibilityLabel="封面"
          />
        )
      )}

      <View style={styles.text}>
        <View style={styles.tagRow}>
          {tags.length ? (
            tags.map((tg) => (
              <TagChip
                key={tg.id}
                hue={tagHue(tg, index.byId)}
                label={tagLabel(tg, index.byId)}
                a11yLabel={`只看「${tagLabel(tg, index.byId)}」`}
                expanded={false}
                onPress={() => onTag(tg.id)}
              />
            ))
          ) : (
            <TagChip hue="slate" label="未分類" a11yLabel="只看「未分類」" expanded={false} onPress={() => onTag(null)} />
          )}
        </View>
        <View style={styles.actions}>
          {!deleted && <Action iconName="download-outline" label="下載" onPress={act('download')} />}
          <Action iconName={post.featured ? 'star' : 'star-outline'} label={post.featured ? '取消精選' : '設為精選'} onPress={act('feature')} />
          <Action iconName="open-outline" label="開啟原文" onPress={act('open')} />
        </View>
      </View>
    </View>
  );
}

export const StreamPost = memo(StreamPostImpl);

const styles = StyleSheet.create({
  post: { paddingVertical: space.xl, gap: space.md, borderBottomWidth: RULE },
  text: { paddingHorizontal: GUTTER, gap: space.md },
  flex: { flex: 1 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  square: { width: 8, height: 8, borderRadius: 1 },
  dateline: { letterSpacing: 1, marginTop: 2 },
  page: { borderRadius: radius.xs, paddingHorizontal: space.lg, paddingBottom: space.lg },
  mark: { fontSize: 44, lineHeight: 52, marginLeft: -16, marginBottom: -12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, marginLeft: -space.sm, marginTop: -space.xs },
  action: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm },
});
