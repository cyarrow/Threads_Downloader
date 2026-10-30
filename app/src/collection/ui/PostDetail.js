import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageSource } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, TagChip } from './base';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// Plays only after the user taps play (never autoplays).
function InlineVideo({ uri, width, height, onError }) {
  const player = useVideoPlayer(imageSource(uri), (p) => {
    p.loop = false;
    p.play();
  });
  // Expired links surface as a player error; let the page re-read the post.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') onError?.();
  });
  return <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />;
}

function MediaItem({ item, index, width, height, placeholder, onStale }) {
  const t = useCollectionTheme();
  const [playing, setPlaying] = useState(false);
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
          onPress={() => setPlaying(true)}
          accessibilityRole="button"
          accessibilityLabel="播放影片"
          style={styles.play}
        >
          <View style={[styles.playCircle, { backgroundColor: t.badge }]}>
            <Ionicons name="play" size={28} color={t.onBadge} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

function MediaPager({ media, width, placeholder, onStale }) {
  const t = useCollectionTheme();
  const [page, setPage] = useState(0);
  const list = useRef(null);
  const height = width * clamp(media[0].ratio || 1, 0.75, 1.25);
  const go = (i) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    setPage(i);
  };
  return (
    <View>
      <FlatList
        ref={list}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <MediaItem item={item} index={index} width={width} height={height} placeholder={placeholder} onStale={onStale} />
        )}
      />
      {media.length > 1 && (
        <>
          <View style={[styles.counter, { backgroundColor: t.badge }]} pointerEvents="none">
            <Text style={[font.caption, { color: t.onBadge }]}>
              {page + 1}/{media.length}
            </Text>
          </View>
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
                <View style={[styles.dot, { backgroundColor: i === page ? t.foreground : t.border }]} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// Detail page: everything the long-press menu offers also has a visible button here.
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

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <IconButton name="arrow-back" label="返回" onPress={onBack} />
        <Text style={[font.headline, styles.topTitle, { color: t.foreground }]} numberOfLines={1} accessibilityRole="header">
          {post.author ? `@${post.author}` : 'Threads 貼文'}
        </Text>
        <IconButton name="ellipsis-vertical" label="更多：在 Threads 開啟、刪除" onPress={act('more')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {post.media.length > 0 ? (
          <MediaPager media={post.media} width={width} placeholder={cover} onStale={reportStale} />
        ) : (
          cover && (
            <Image source={cover} style={{ width, height: width }} contentFit="contain" accessibilityLabel="封面" />
          )
        )}
        <View style={styles.body}>
          {updating && (
            <View style={[styles.notice, { backgroundColor: t.muted }]} accessibilityLiveRegion="polite">
              <Ionicons name="refresh" size={icon.md} color={t.mutedForeground} />
              <Text style={[font.meta, { color: t.mutedForeground, flex: 1 }]}>這是舊的下載紀錄，正在補上完整內容…</Text>
            </View>
          )}
          {deleted && (
            <View style={[styles.notice, { backgroundColor: t.muted }]}>
              <Ionicons name="cloud-offline-outline" size={icon.md} color={t.mutedForeground} />
              <Text style={[font.meta, { color: t.mutedForeground, flex: 1 }]}>原貼文已刪除，只剩收藏時存下的內容，無法下載原檔。</Text>
            </View>
          )}
          {!!post.caption && (
            <Text style={[post.media.length || cover ? font.content : font.quote, { color: t.foreground }]} selectable>
              {post.caption}
            </Text>
          )}
          <Text style={[font.meta, { color: t.mutedForeground }]}>收藏於 {formatDate(post.savedAt)}</Text>

          <View style={styles.sectionHeader}>
            <Text style={[font.headline, { color: t.foreground }]}>標籤</Text>
            <Pressable onPress={act('tags')} accessibilityRole="button" style={styles.editTags}>
              <Text style={[font.label, { color: t.accent }]}>編輯標籤</Text>
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
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: t.border, backgroundColor: t.card, paddingBottom: insets.bottom + space.md }]}>
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
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  topTitle: { flex: 1, marginHorizontal: space.xs },
  body: { padding: space.lg, gap: space.md },
  notice: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  editTags: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  play: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', top: space.md, right: space.md, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 2, paddingTop: space.sm },
  dotTarget: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  secondaryRow: { flexDirection: 'row', gap: space.sm },
});
