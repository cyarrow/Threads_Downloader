import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageSource } from '../media';
import { playbackFocus, playingAfterPageChange } from '../playback';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, TagChip } from './base';
import { PRINT_INSET, PhotoBack, Print, TagKicker } from './theme';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Same screen margin as the card wall, so the article column lines up with it.
const GUTTER = 20;
const RULE = StyleSheet.hairlineWidth * 2;
// 底片: media sit as a print with this much page showing on each side.
const PRINT_MARGIN = 14;

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// Plays only after the user taps play (never autoplays). Mounted only while its
// page is playing; unmounting (page swiped away, detail closed) releases the
// player, which stops it. Backgrounding the app is handled by expo-video itself:
// staysActiveInBackground is false by default, so it pauses on Android/iOS.
function InlineVideo({ uri, width, height, onError }) {
  const player = useVideoPlayer(imageSource(uri), (p) => {
    p.loop = false;
    p.play();
  });
  // Expired links surface as a player error; let the page re-read the post.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') onError?.();
  });
  // One video at a time app-wide: starting this one (▶ or the native controls)
  // pauses whichever was playing.
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) playbackFocus.claim(player);
    else playbackFocus.drop(player);
  });
  useEffect(() => () => playbackFocus.drop(player), [player]);
  return <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />;
}

function MediaItem({ item, index, width, height, placeholder, playing, onPlay, onStale }) {
  const t = useCollectionTheme();
  const isVideo = item.type === 'video';
  if (isVideo && playing) {
    return <InlineVideo uri={item.url} width={width} height={height} onError={onStale} />;
  }
  return (
    <View style={{ width, height, backgroundColor: t.muted }}>
      <Image
        source={imageSource(isVideo ? item.poster : item.url)}
        placeholder={index === 0 ? placeholder : undefined}
        placeholderContentFit="contain"
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={150}
        onError={onStale}
        accessibilityLabel={`第 ${index + 1} 項${isVideo ? '影片' : '圖片'}`}
      />
      {isVideo && (
        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel="播放影片"
          // Explicit size instead of absoluteFill: on Android the stretched
          // absolute Pressable collapsed to its content, pinning ▶ to the top.
          style={[styles.play, { width, height }]}
        >
          <View style={[styles.playCircle, { backgroundColor: t.badge }]}>
            <Ionicons name="play" size={28} color={t.onBadge} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

// Also used by the 串流 tab (StreamPost). `active={false}` (the post scrolled out
// of view) sends a playing page back to its poster, which releases the player.
// `width` is the width of one page (the photo itself); in 底片 the pager sits in a
// print frame (paper edge + savedAt date imprint, hidden while a video plays so
// it never covers the native controls).
export function MediaPager({ media, width, placeholder, onStale, active = true, savedAt }) {
  const t = useCollectionTheme();
  const [page, setPage] = useState(0);
  // The page whose video is playing (-1 = none). Held here, not per item, so only
  // the page on screen can have a player: FlatList keeps neighbouring pages
  // mounted, and a video swiped away would otherwise keep playing off-screen.
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setPlayingIndex(-1);
  }
  const list = useRef(null);
  const height = width * clamp(media[0].ratio || 1, 0.75, 1.25);
  const settle = (i) => {
    setPage(i);
    setPlayingIndex((p) => playingAfterPageChange(p, i));
  };
  const go = (i) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    settle(i);
  };
  const pager = (
      <FlatList
        ref={list}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => settle(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        extraData={playingIndex}
        renderItem={({ item, index }) => (
          <MediaItem
            item={item}
            index={index}
            width={width}
            height={height}
            placeholder={placeholder}
            playing={playingIndex === index}
            onPlay={() => setPlayingIndex(index)}
            onStale={onStale}
          />
        )}
      />
  );
  return (
    <View>
      {t.printFrame ? (
        <Print savedAt={savedAt} imprint={playingIndex !== page} style={[styles.print, { width: width + PRINT_INSET }]}>
          {pager}
        </Print>
      ) : (
        pager
      )}
      {media.length > 1 && (
        // Page marks and counter sit under the photo (nothing printed over it).
        // The current mark is longer, not only darker, and the counter says it in numbers.
        <View style={styles.pagerRow}>
          <View style={styles.dots}>
            {media.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => go(i)}
                accessibilityRole="button"
                accessibilityLabel={`第 ${i + 1} 項`}
                accessibilityState={{ selected: i === page }}
                hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
                style={styles.dotTarget}
              >
                <View style={[styles.dot, i === page && styles.dotOn, { backgroundColor: i === page ? t.foreground : t.outline }]} />
              </Pressable>
            ))}
          </View>
          <Text style={[t.font.caption, styles.counter, { color: t.mutedForeground }]}>
            {page + 1} / {media.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// Detail page, laid out like a magazine article page: media, then a kicker (tag
// square + 大標籤 › 小標籤), the post in WenKai, a byline with the saved date, and
// the tags — hairline rules between sections instead of boxes. Everything the
// long-press menu offers also has a visible button here.
// `onStale` is called when a media link fails (links expire) so the post gets re-read.
export function PostDetail({ post, index, onBack, onAction, onStale }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const staleOnce = useRef(false);
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const deleted = post.status === 'sourceDeleted';
  const act = (kind) => () => onAction(kind, post);
  const cover = imageSource(post.cover);
  const reportStale = () => {
    if (staleOnce.current) return;
    staleOnce.current = true;
    onStale?.(post);
  };
  const updating = !post.media.length && post.status === 'ready' && !post.fetchedAt;
  const visual = post.media.length > 0 || !!cover;
  const hue = tags[0] ? tagHue(tags[0], index.byId) : 'slate';
  const rule = { borderTopColor: t.border };
  // 底片 insets the photo as a print; 雜誌 runs it edge to edge.
  const mediaWidth = t.printFrame ? width - PRINT_MARGIN * 2 - PRINT_INSET : width;

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <IconButton name="arrow-back" label="返回" onPress={onBack} />
        {/* Running head: the author, quietly, like a magazine page header. */}
        <Text style={[t.font.kicker, styles.topTitle, { color: t.mutedForeground }]} numberOfLines={1} accessibilityRole="header">
          {post.author ? `@${post.author}` : 'Threads 貼文'}
        </Text>
        <IconButton name="ellipsis-vertical" label="更多：在 Threads 開啟、刪除" onPress={act('more')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        {post.media.length > 0 ? (
          <MediaPager media={post.media} width={mediaWidth} placeholder={cover} onStale={reportStale} savedAt={post.savedAt} />
        ) : (
          cover &&
          (t.printFrame ? (
            <Print savedAt={post.savedAt} style={[styles.print, { width: mediaWidth + PRINT_INSET }]}>
              <Image source={cover} style={{ width: mediaWidth, height: mediaWidth }} contentFit="contain" accessibilityLabel="封面" />
            </Print>
          ) : (
            <Image source={cover} style={{ width, height: width }} contentFit="contain" accessibilityLabel="封面" />
          ))
        )}
        <View style={styles.body}>
          {updating && (
            <View style={[styles.notice, { borderColor: t.border }]} accessibilityLiveRegion="polite">
              <Ionicons name="refresh" size={icon.md} color={t.mutedForeground} />
              <Text style={[t.font.meta, { color: t.mutedForeground, flex: 1 }]}>這是舊的下載紀錄，正在補上完整內容…</Text>
            </View>
          )}
          {deleted && (
            <View style={[styles.notice, { borderColor: t.border }]}>
              <Ionicons name="cloud-offline-outline" size={icon.md} color={t.mutedForeground} />
              <Text style={[t.font.meta, { color: t.mutedForeground, flex: 1 }]}>原貼文已刪除，只剩收藏時存下的內容，無法下載原檔。</Text>
            </View>
          )}

          <TagKicker hue={hue} featured={post.featured} untagged={!tags[0]} label={tags[0] ? tagLabel(tags[0], index.byId) : '未分類'} />

          {!!post.caption &&
            (visual ? (
              <Text style={[t.font.content, { color: t.foreground }]} selectable>
                {post.caption}
              </Text>
            ) : (
              // Text-only post: the same paper as its card on the wall (tag-tinted
              // page in 雜誌, ruled photo back in 底片).
              <PhotoBack hue={hue} text={post.caption} savedAt={post.savedAt} large selectable />
            ))}

          <View style={[styles.byline, rule]}>
            {!!post.author && (
              <Text style={[t.font.label, { color: t.foreground }]} numberOfLines={1}>
                <Text style={{ color: t.mutedForeground }}>文 ／ </Text>@{post.author}
              </Text>
            )}
            <Text style={[t.font.caption, styles.dateline, { color: t.mutedForeground }]}>收藏於 {formatDate(post.savedAt)}</Text>
          </View>

          <View style={[styles.section, rule]}>
            <View style={styles.sectionHeader}>
              <Text style={[t.font.kicker, { color: t.mutedForeground }]}>標籤</Text>
              <Pressable onPress={act('tags')} accessibilityRole="button" style={styles.editTags}>
                <Text style={[t.font.label, { color: t.accent }]}>編輯標籤</Text>
                <Ionicons name="chevron-forward" size={icon.sm} color={t.accent} />
              </Pressable>
            </View>
            <View style={styles.tagRow}>
              {tags.length ? (
                tags.map((tg) => <TagChip key={tg.id} variant="display" hue={tagHue(tg, index.byId)} label={tagLabel(tg, index.byId)} />)
              ) : (
                <TagChip variant="display" hue="slate" label="未分類" />
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: t.border, backgroundColor: t.background, paddingBottom: insets.bottom + space.md }]}>
        {!deleted && !post.downloaded && <PrimaryButton title="下載到相簿" iconName="download-outline" onPress={act('download')} />}
        <View style={styles.secondaryRow}>
          {!deleted && post.downloaded && <SecondaryButton title="再次下載" iconName="download-outline" onPress={act('download')} />}
          <SecondaryButton
            title={post.featured ? '取消精選' : '設為精選'}
            iconName={post.featured ? 'star' : 'star-outline'}
            onPress={act('feature')}
          />
          <SecondaryButton title="開啟原文" iconName="open-outline" onPress={act('open')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, borderBottomWidth: RULE },
  topTitle: { flex: 1, marginHorizontal: space.xs },
  flex: { flex: 1 },
  body: { paddingHorizontal: GUTTER, paddingTop: space.lg, gap: space.md },
  // Editor's-note band: hairlines above and below instead of a filled box.
  notice: { flexDirection: 'row', gap: space.sm, paddingVertical: space.md, borderTopWidth: RULE, borderBottomWidth: RULE, alignItems: 'center' },
  print: { marginHorizontal: PRINT_MARGIN, marginTop: space.md, alignSelf: 'flex-start' },
  byline: { borderTopWidth: RULE, paddingTop: space.md, marginTop: space.xs, gap: 2 },
  dateline: { letterSpacing: 1 },
  section: { borderTopWidth: RULE, marginTop: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -space.sm },
  editTags: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: space.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  play: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER - 4, paddingTop: space.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dotTarget: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 1 },
  dotOn: { width: 20 },
  counter: { letterSpacing: 1, fontVariant: ['tabular-nums'], marginRight: 4 },
  actions: { borderTopWidth: RULE, paddingHorizontal: GUTTER, paddingTop: space.md, gap: space.sm },
  secondaryRow: { flexDirection: 'row', gap: space.sm },
});
