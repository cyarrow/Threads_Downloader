import { memo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cardStill, imageSource } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { TagChip } from './base';
import { MediaPager } from './PostDetail';
import { PRINT_INSET, PhotoBack, Print, SprocketRule, TagKicker } from './theme';

const GUTTER = 20;
const RULE = StyleSheet.hairlineWidth * 2;
// 底片: media sit as a print with this much page on each side (as on the detail page).
const PRINT_MARGIN = 14;

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
      <Text style={[t.font.label, { color: t.foreground }]}>{label}</Text>
    </Pressable>
  );
}

// One post in the 串流 tab, read like a Threads post: kicker, byline, the whole
// caption (never truncated), then the media — the same pager as the detail page
// (swipe, page marks, counter, tap-to-play with one video at a time app-wide) —
// its tags (tap → filter the feed) and actions.
// 雜誌: media full width, a hairline between posts, text-only posts on the
// tag-tinted page. 底片: a sprocket strip opens each post like a frame on a roll,
// media are a print (paper edge, savedAt imprint) inset from the screen edge,
// text-only posts are the back of a photo.
// `active`: false once the post scrolls out of view, which stops its video.
// `onAuthor(handle)`: the byline was tapped.
function StreamPostImpl({ post, index, width, active, onTag, onAuthor, onAction, onStale }) {
  const t = useCollectionTheme();
  const staleOnce = useRef(false);
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const still = cardStill(post);
  const deleted = post.status === 'sourceDeleted';
  const film = t.printFrame;
  // 底片 insets the photo as a print (like PostDetail); 雜誌 runs it edge to edge.
  const mediaWidth = film ? width - PRINT_MARGIN * 2 - PRINT_INSET : width;
  const act = (kind) => () => onAction(kind, post);
  const reportStale = () => {
    if (staleOnce.current) return;
    staleOnce.current = true;
    onStale?.(post);
  };

  return (
    <View style={[styles.post, film ? styles.postFilm : { borderBottomColor: t.border }]}>
      {film && <SprocketRule height={12} pitch={16} style={styles.strip} />}
      <View style={styles.text}>
        <TagKicker hue={hue} featured={post.featured} untagged={!tags[0]} label={tags[0] ? tagLabel(tags[0], index.byId) : '未分類'} />
        {/* Byline: one ≥48dp touch target (handle + date) that opens the author's page. */}
        <Pressable
          onPress={() => onAuthor?.(post.author)}
          disabled={!onAuthor || !post.author}
          accessibilityRole="button"
          accessibilityLabel={`作者 @${post.author} 的所有收藏`}
          style={({ pressed }) => [styles.byline, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[t.font.headline, { color: t.foreground }]} numberOfLines={1}>
            {t.theme !== 'film' && <Text style={[t.font.label, { color: t.mutedForeground }]}>文 ／ </Text>}@{post.author}
            {!!onAuthor && <Text style={[t.font.label, { color: t.mutedForeground }]}> ›</Text>}
          </Text>
          <Text style={[t.font.caption, styles.dateline, { color: t.mutedForeground }]}>
            收藏於 {shortDate(post.savedAt)}
            {deleted ? ' · 原貼文已刪除' : ''}
          </Text>
        </Pressable>
        {!!post.caption &&
          (post.media.length || still ? (
            <Text style={[t.font.content, { color: t.foreground }]} selectable>
              {post.caption}
            </Text>
          ) : (
            // Text-only post: the same paper as its card and detail page.
            <PhotoBack hue={hue} text={post.caption} savedAt={post.savedAt} large selectable />
          ))}
      </View>

      {post.media.length > 0 ? (
        // Keyed by post so a recycled cell never inherits another post's page or player.
        <MediaPager
          key={post.id}
          media={post.media}
          width={mediaWidth}
          placeholder={imageSource(post.cover)}
          onStale={reportStale}
          active={active}
          savedAt={post.savedAt}
        />
      ) : (
        still &&
        (film ? (
          <Print savedAt={post.savedAt} style={[styles.print, { width: mediaWidth + PRINT_INSET }]}>
            <Image
              source={still}
              recyclingKey={post.id}
              style={{ width: mediaWidth, height: mediaWidth, backgroundColor: t.muted }}
              contentFit="contain"
              accessibilityLabel="封面"
            />
          </Print>
        ) : (
          <Image
            source={still}
            recyclingKey={post.id}
            style={{ width, height: width, backgroundColor: t.muted }}
            contentFit="contain"
            accessibilityLabel="封面"
          />
        ))
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
  postFilm: { borderBottomWidth: 0, paddingTop: 0 },
  strip: { marginBottom: space.xs },
  print: { marginHorizontal: PRINT_MARGIN, alignSelf: 'flex-start' },
  dateline: { letterSpacing: 1, marginTop: 2 },
  byline: { minHeight: TOUCH, justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, marginLeft: -space.sm, marginTop: -space.xs },
  action: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm },
});
