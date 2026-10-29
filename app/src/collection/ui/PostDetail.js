import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, TagChip } from './base';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function MediaPager({ media, width }) {
  const t = useCollectionTheme();
  const [page, setPage] = useState(0);
  const list = useRef(null);
  const height = width * clamp(media[0].ratio, 0.75, 1.25);
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
          <View style={{ width, height, backgroundColor: t.muted }}>
            <Image
              source={item.image}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel={`第 ${index + 1} 項${item.type === 'video' ? '影片' : '圖片'}`}
            />
            {item.type === 'video' && (
              <View style={styles.play} pointerEvents="none">
                <View style={[styles.playCircle, { backgroundColor: t.badge }]}>
                  <Ionicons name="play" size={28} color={t.onBadge} />
                </View>
              </View>
            )}
          </View>
        )}
      />
      {media.length > 1 && (
        <>
          <View style={[styles.counter, { backgroundColor: t.badge }]}>
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
export function PostDetail({ post, index, onBack, onAction }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tags = post.tagIds.map((id) => index.byId[id]).filter(Boolean);
  const deleted = post.status === 'sourceDeleted';
  const act = (kind) => () => onAction(kind, post);

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <IconButton name="arrow-back" label="返回" onPress={onBack} />
        <Text style={[font.headline, styles.topTitle, { color: t.foreground }]} numberOfLines={1} accessibilityRole="header">
          @{post.author}
        </Text>
        <IconButton name="ellipsis-vertical" label="更多：在 Threads 開啟、刪除" onPress={act('more')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {post.media.length > 0 && <MediaPager media={post.media} width={width} />}
        <View style={styles.body}>
          {deleted && (
            <View style={[styles.notice, { backgroundColor: t.muted }]}>
              <Ionicons name="cloud-offline-outline" size={icon.md} color={t.mutedForeground} />
              <Text style={[font.meta, { color: t.mutedForeground, flex: 1 }]}>原貼文已刪除，只剩收藏時存下的內容，無法下載原檔。</Text>
            </View>
          )}
          {!!post.caption && (
            <Text style={[post.media.length ? font.body : font.quote, { color: t.foreground }]}>{post.caption}</Text>
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
          <SecondaryButton title="在 Threads 開啟" iconName="open-outline" onPress={act('open')} />
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
