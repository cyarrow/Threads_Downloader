import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { HeaderActions } from './HeaderActions';
import { IconButton, TagChip } from './base';
import { EmptyState } from './Overlays';
import { PostCard } from './PostCard';
import { SelectableCell, SelectionBar, SelectionHeader } from './Selection';
import { TagScrollRow } from './TagScrollRow';
import { MastheadRule } from './theme';
import { allSelected, isSelectable, selectableIds } from '../batch';

// Editorial spacing: wide margins and generous gaps; the hairline under each card
// does the separating that card boxes used to.
const GUTTER = 20; // screen edge
const GAP = space.lg; // between columns
const ROW_GAP = 20; // between cards in a column

// The 收藏 tab: masthead, search, one scrolling row of tag chips ending in
// 「所有標籤 ›」, and the masonry wall (featured cards span every column).
// Layout rules: pages/card-wall.md. The ＋ 收藏連結 button lives in the
// masthead next to 搜尋 and 設定 (it used to float bottom-right).
// The same wall also renders a tag page (`title` + `onBack`, and `filterBar`
// replacing the chip row with that tag's 小標籤).
// `searching` / `onSearching` are optional: pass them to control the search
// field from outside (other tabs' 搜尋 opens it here).
// The author page passes `compactTitle` (the @handle in the title size, not the
// masthead's) and no `onAdd` / `onSettings`.
// 批次選取: `onSelect` puts 選取多篇 in the title row; `selection` ({ ids,
// onToggle, onSelectAll, onClear, onExit, onAction, featureOn }) switches the
// wall into selection mode — 「已選 N 篇」 header, tap toggles a card, and the
// action bar under the list (so the list ends above it, never under it).
export function CardWall({
  posts, total, index, filter, onFilter, query, onQuery, onOpen, onMenu, onRetry, onStale, onAdd, onSettings, banner,
  onRefresh, refreshing, overlay, searching: searchingProp, onSearching, title = '收藏', onBack, backLabel = '返回所有標籤',
  kicker, filterBar, onAllTags, compactTitle, onSelect, selection, emptyText,
}) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [searchingLocal, setSearchingLocal] = useState(!!query);
  const searching = searchingProp ?? searchingLocal;
  const setSearching = onSearching ?? setSearchingLocal;
  const columns = width >= 600 ? 3 : 2;
  const filtered = filter.length > 0 || !!query.trim();
  const picked = selection?.ids;

  const header = (
    <View style={styles.header}>
      {banner}
      {kicker !== null && (
        // 底片 drops the magazine's name and keeps only the count.
        <Text style={[t.font.kicker, styles.kicker, { color: t.mutedForeground }]}>
          {selection
            ? '點卡片勾選，再選下方的動作'
            : kicker ?? (t.printFrame ? `${total ?? posts.length} 篇` : `THREADS 收藏誌 · ${total ?? posts.length} 篇`)}
        </Text>
      )}
      <View>
        {selection ? (
          <SelectionHeader
            count={picked.length}
            selectable={selectableIds(posts).length}
            allPicked={allSelected(posts, picked)}
            onSelectAll={selection.onSelectAll}
            onClear={selection.onClear}
            onExit={selection.onExit}
          />
        ) : (
          <View style={[styles.titleRow, onBack && styles.titleRowBack]}>
            {onBack && <IconButton name="chevron-back" label={backLabel} onPress={onBack} />}
            <Text
              style={[compactTitle ? t.font.title : t.font.display, styles.title, { color: t.foreground }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <HeaderActions
              onSelect={posts.some(isSelectable) ? onSelect : undefined}
              onAdd={onAdd}
              searching={searching}
              onSearch={() => {
                if (searching) onQuery('');
                setSearching(!searching);
              }}
              onSettings={onSettings}
            />
          </View>
        )}
        {/* 2px ink line (雜誌) or a sprocket strip (底片). */}
        <MastheadRule style={styles.rule} />
      </View>
      {searching && (
        <View style={[styles.search, { backgroundColor: t.field, borderRadius: t.radius.sm }]}>
          <Ionicons name="search" size={icon.md} color={t.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            autoFocus
            placeholder="搜尋作者或內文"
            placeholderTextColor={t.mutedForeground}
            accessibilityLabel="搜尋作者或內文"
            returnKeyType="search"
            style={[t.font.body, styles.searchInput, { color: t.foreground }]}
          />
        </View>
      )}
      {filterBar ?? (
        <TagScrollRow
          index={index}
          selected={filter}
          onChange={onFilter}
          multi
          bleed={GUTTER}
          resultCount={posts.length}
          trailing={
            onAllTags && (
              <TagChip neutral label="所有標籤" a11yLabel="所有標籤" trailingIcon="chevron-forward" expanded={false} onPress={onAllTags} />
            )
          }
        />
      )}
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
        extraData={picked}
        renderItem={({ item }) => {
          const card = (
            <PostCard
              post={item}
              index={index}
              onOpen={onOpen}
              onMenu={onMenu}
              onRetry={onRetry}
              onStale={onStale}
              wide={columns >= 3}
              maxMediaHeight={Math.round(height * 0.55)}
            />
          );
          return (
            <View style={styles.cell}>
              {selection ? (
                <SelectableCell
                  post={item}
                  selected={picked.includes(item.id)}
                  disabled={!isSelectable(item)}
                  onToggle={() => selection.onToggle(item.id)}
                >
                  {card}
                </SelectableCell>
              ) : (
                card
              )}
            </View>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            filtered={filtered}
            text={emptyText}
            onAction={filtered ? () => { onFilter([]); onQuery(''); } : emptyText ? onBack : onAdd}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + space.sm,
          paddingHorizontal: GUTTER - GAP / 2,
          paddingBottom: insets.bottom + space.xxl,
        }}
      />
      {selection && <SelectionBar count={picked.length} featureOn={selection.featureOn} onAction={selection.onAction} />}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: GAP / 2, paddingBottom: space.md, gap: space.md },
  kicker: { marginBottom: -space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginRight: -space.sm },
  titleRowBack: { marginLeft: -space.md },
  title: { flex: 1, minWidth: 0 },
  rule: { marginTop: space.xs },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, minHeight: TOUCH },
  searchInput: { flex: 1, minWidth: 0, minHeight: TOUCH },
  cell: { paddingHorizontal: GAP / 2, paddingVertical: ROW_GAP / 2 },
});
