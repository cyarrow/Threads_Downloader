import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { streamItemType, streamPosts } from '../streamModel';
import { TOUCH, space, useCollectionTheme } from '../tokens';
import { ScreenHeader } from './HeaderActions';
import { StreamPost } from './StreamPost';
import { TagScrollRow } from './TagScrollRow';
import { TagChip } from './base';

const GUTTER = 20;
// Seed for 隨機: fixed for this app session so the order holds while scrolling
// and switching tabs; 換一批 moves to the next one.
const SESSION_SEED = Date.now() % 100000;

// Segmented 最新收藏 / 隨機 switch: ink fill + bold for the chosen half (not colour alone).
function OrderToggle({ order, onChange }) {
  const t = useCollectionTheme();
  const item = (key, label) => {
    const on = order === key;
    return (
      <Pressable
        key={key}
        onPress={() => onChange(key)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        aria-checked={on}
        hitSlop={{ top: 4, bottom: 4 }}
        style={[styles.segment, on && { backgroundColor: t.foreground }]}
      >
        <Text style={[t.font.label, { color: on ? t.background : t.foreground }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="排序" style={[styles.toggle, { borderColor: t.outline, borderRadius: t.radius.sm }]}>
      {item('new', '最新收藏')}
      {item('random', '隨機')}
    </View>
  );
}

// The 串流 tab: one post after another, full width, like Threads. `filter` is
// lifted to the app so a tag page's 「用串流看 ›」 can open the feed on that tag.
// `active`: the tab is on screen with nothing covering it; otherwise any video stops.
// `author` (作者頁's 「用串流看 ›」) narrows the feed to one handle, shown as a
// filled 「@handle ✕」 chip above the tags; `onClearAuthor` drops it.
// `onAuthor(handle)`: a post's byline was tapped (opens that author's page).
export function StreamScreen({ posts, index, filter, onFilter, author, onClearAuthor, onAuthor, active, actions, onAction, onStale }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [order, setOrder] = useState('new');
  const [seed, setSeed] = useState(SESSION_SEED);
  const [visible, setVisible] = useState(() => new Set());
  const list = useRef(null);
  const data = useMemo(() => streamPosts(posts, { order, seed, filter, author, index }), [posts, order, seed, filter, author, index]);

  // A new filter or order starts at the top. (FlashList keeps the item on screen
  // in place when data changes, which is right for a post saved meanwhile but
  // not for a different feed.) After layout, so the anchoring can't undo it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => list.current?.scrollToOffset({ offset: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [filter, author, order, seed]);
  const onViewable = useCallback(({ viewableItems }) => setVisible(new Set(viewableItems.map((v) => v.item.id))), []);

  const header = (
    <View style={styles.header}>
      <ScreenHeader title="串流" actions={actions} />
      <View style={styles.orderRow}>
        <OrderToggle order={order} onChange={setOrder} />
        {order === 'random' && (
          <Pressable
            onPress={() => setSeed((s) => s + 1)}
            accessibilityRole="button"
            style={styles.textButton}
          >
            <Text style={[t.font.label, { color: t.accent }]}>換一批</Text>
          </Pressable>
        )}
      </View>
      {!!author && (
        <View style={styles.authorRow}>
          <TagChip
            neutral
            selected
            label={`@${author}`}
            trailingIcon="close"
            expanded={false}
            a11yLabel={`只看 @${author}，點一下看全部作者`}
            onPress={onClearAuthor}
          />
        </View>
      )}
      <TagScrollRow
        index={index}
        selected={filter ? [filter] : []}
        onChange={(ids) => onFilter(ids[0] ?? null)}
        bleed={GUTTER}
        resultCount={data.length}
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <FlashList
        ref={list}
        data={data}
        keyExtractor={(p) => p.id}
        getItemType={streamItemType}
        extraData={{ visible, active }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        onViewableItemsChanged={onViewable}
        renderItem={({ item }) => (
          <StreamPost
            post={item}
            index={index}
            width={width}
            active={active && visible.has(item.id)}
            onTag={onFilter}
            onAuthor={onAuthor}
            onAction={onAction}
            onStale={onStale}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[t.font.title, { color: t.foreground }]}>{author ? `@${author} 沒有符合的貼文` : filter ? '這個標籤還沒有貼文' : '還沒有收藏'}</Text>
            <View style={[styles.rule, { backgroundColor: t.foreground }]} />
            <Text style={[t.font.body, { color: t.mutedForeground }]}>
              {filter ? '換一個標籤，或選「全部」。' : '從 Threads 分享貼文，或按右上角的 ＋ 貼上連結。'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: GUTTER, gap: space.sm, paddingBottom: space.xs },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  toggle: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segment: { minHeight: 40, paddingHorizontal: space.md, justifyContent: 'center' },
  textButton: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.sm },
  empty: { paddingHorizontal: GUTTER, paddingVertical: space.xxl, gap: space.md, alignItems: 'flex-start' },
  rule: { width: 32, height: 2 },
  authorRow: { flexDirection: 'row', paddingVertical: (TOUCH - 36) / 2 },
});
