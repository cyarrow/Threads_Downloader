import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOUCH, elevation, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton, PressScale } from './base';
import { EmptyState } from './Overlays';
import { PostCard } from './PostCard';
import { TagFilterBar } from './TagFilterBar';

const GUTTER = space.lg; // screen edge
const GAP = space.sm; // between cards

// Home screen: top bar, search, tag filter, masonry wall (featured cards span
// every column), and the + button. Layout rules: pages/card-wall.md.
export function CardWall({ posts, index, filter, onFilter, query, onQuery, onOpen, onMenu, onRetry, onAdd, onSettings, banner, onRefresh, refreshing, overlay }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [searching, setSearching] = useState(!!query);
  const columns = width >= 600 ? 3 : 2;
  const filtered = filter.length > 0 || !!query.trim();

  const header = (
    <View style={styles.header}>
      {banner}
      <View style={styles.titleRow}>
        <Text style={[font.display, { color: t.foreground, flex: 1 }]} accessibilityRole="header">
          收藏
        </Text>
        <IconButton
          name={searching ? 'close' : 'search'}
          label={searching ? '關閉搜尋' : '搜尋'}
          onPress={() => {
            if (searching) onQuery('');
            setSearching(!searching);
          }}
        />
        <IconButton name="settings-outline" label="設定" onPress={onSettings} />
      </View>
      {searching && (
        <View style={[styles.search, { backgroundColor: t.field }]}>
          <Ionicons name="search" size={icon.md} color={t.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            autoFocus
            placeholder="搜尋作者或內文"
            placeholderTextColor={t.mutedForeground}
            accessibilityLabel="搜尋作者或內文"
            returnKeyType="search"
            style={[font.body, styles.searchInput, { color: t.foreground }]}
          />
        </View>
      )}
      <TagFilterBar index={index} selected={filter} onChange={onFilter} resultCount={posts.length} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <FlashList
        data={posts}
        masonry
        numColumns={columns}
        optimizeItemArrangement
        keyExtractor={(p) => p.id}
        // Text cards and photo cards recycle separately so a reused cell never
        // has to swap a photo layout for a quote layout mid-scroll.
        getItemType={(p) => (p.featured ? 'featured' : p.media.length || p.cover ? 'photo' : 'text')}
        // Render a screen's worth ahead so fast scrolling doesn't reveal blank cards.
        drawDistance={height}
        onRefresh={onRefresh}
        refreshing={!!refreshing}
        overrideItemLayout={(layout, item) => {
          if (item.featured) layout.span = columns;
        }}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <PostCard
              post={item}
              index={index}
              onPress={() => onOpen(item)}
              onLongPress={() => onMenu(item)}
              onRetry={() => onRetry(item)}
              wide={columns >= 3}
              maxMediaHeight={Math.round(height * 0.55)}
            />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState filtered={filtered} onAction={filtered ? () => { onFilter([]); onQuery(''); } : onAdd} />}
        contentContainerStyle={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: GUTTER - GAP / 2,
          paddingBottom: insets.bottom + 56 + space.xl * 2,
        }}
      />
      <PressScale
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="貼上連結收藏"
        containerStyle={[styles.fabPosition, { bottom: insets.bottom + space.lg }]}
        style={[styles.fab, elevation.level1, { backgroundColor: t.primary }]}
      >
        <Ionicons name="add" size={28} color={t.onPrimary} />
      </PressScale>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: GAP / 2, paddingBottom: space.md, gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginRight: -space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: TOUCH },
  searchInput: { flex: 1, minWidth: 0, minHeight: TOUCH },
  cell: { padding: GAP / 2 },
  fabPosition: { position: 'absolute', right: space.lg },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
