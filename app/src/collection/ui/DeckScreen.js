import { useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spring, useReduceMotion } from '../../ui/motion';
import {
  ALL,
  TAP_SLOP,
  actionMessage,
  advance,
  deckAction,
  deckHint,
  newDeck,
  releaseDirection,
  remaining,
  syncDeck,
  topIndex,
  underIndex,
  undoDeck,
} from '../deckModel';
import { quickReasonText } from '../quickSave';
import { isBrowsable } from '../rediscover';
import { suggestTags } from '../suggest';
import { UNCATEGORIZED, filterPosts, tagLabel } from '../tagModel';
import { TOUCH, font, icon, space, useCollectionTheme } from '../tokens';
import { ScreenHeader } from './HeaderActions';
import { DeckCard } from './DeckCard';
import { TagScrollRow } from './TagScrollRow';

const GUTTER = 20;
// Shuffle seed for this app session: the order stays put while the app is open;
// 再洗一次 deals the next one.
const SESSION_SEED = Date.now() % 100000;

// The draggable top card. Follows the finger, tilts with the horizontal offset,
// fades a stamp in, and on release either flies off (and then reports the
// direction) or springs back. A tap (no movement) opens the post. With reduced
// motion there is no fly-out: the action happens and the next card is just there.
// `ref.fling(direction)`: the same exit for the buttons under the deck.
// `exits(direction)`: whether that direction removes the card (fly) or not.
function SwipeCard({ ref, post, index, top, likeLabel, likeIcon, nopeLabel, onSwipe, onOpen, exits }) {
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const pan = useState(() => new Animated.ValueXY())[0];
  const busy = useRef(false);
  // Set when a drag takes over, so the click a browser still fires at the end
  // of a mouse drag doesn't also open the post (native cancels the press itself).
  const dragged = useRef(false);
  const latest = useRef({});
  useLayoutEffect(() => {
    latest.current = { top, onSwipe, reduce, width, exits };
  });

  const fling = useCallback(
    (direction) => {
      const { onSwipe: report, reduce: still, width: w, exits: leaves } = latest.current;
      if (busy.current) return;
      // Only a card that actually leaves the deck flies out; one that opens the
      // tag sheet (up, or right in 未分類 without a suggestion) comes back.
      if (still || !leaves?.(direction)) {
        pan.setValue({ x: 0, y: 0 });
        report(direction);
        return;
      }
      busy.current = true;
      const x = direction === 'right' ? w * 1.3 : -w * 1.3;
      Animated.timing(pan, { toValue: { x, y: 40 }, duration: 220, useNativeDriver: false }).start(() => {
        busy.current = false;
        report(direction);
      });
    },
    [pan],
  );
  useImperativeHandle(ref, () => ({ fling }), [fling]);

  // The handlers read the latest props through `latest` when a gesture runs,
  // never during render; the rule can't see that through PanResponder.create.
  // eslint-disable-next-line react-hooks/refs
  const responder = useState(() =>
    PanResponder.create({
      // Let the card's Pressable take taps; claim the gesture once the finger moves.
      onMoveShouldSetPanResponderCapture: (_, g) => latest.current.top && !busy.current && (Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP),
      onPanResponderGrant: () => {
        dragged.current = true;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const direction = releaseDirection(g.dx, g.dy);
        if (direction === 'right' || direction === 'left' || direction === 'up') return fling(direction);
        if (latest.current.reduce) return pan.setValue({ x: 0, y: 0 });
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, ...spring(0.35), useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
    }),
  )[0];

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, 90], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-90, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const caption = (post.caption || '').slice(0, 30);

  if (!top) {
    // Peeks out behind the top card; not interactive, hidden from screen readers.
    return (
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, styles.under]}>
        <DeckCard post={post} index={index} />
      </View>
    );
  }
  return (
    <Animated.View
      {...responder.panHandlers}
      style={[StyleSheet.absoluteFill, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: reduce ? '0deg' : rotate }] }]}
    >
      <Pressable
        onPressIn={() => {
          dragged.current = false;
        }}
        onPress={() => !dragged.current && onOpen(post)}
        accessibilityRole="button"
        accessibilityLabel={`@${post.author}，${caption}`}
        accessibilityHint="開啟貼文。用下方的按鈕設為精選、看下一張或加標籤"
        style={styles.fill}
      >
        <DeckCard post={post} index={index} likeLabel={likeLabel} likeIcon={likeIcon} nopeLabel={nopeLabel} likeOpacity={likeOpacity} nopeOpacity={nopeOpacity} />
      </Pressable>
    </Animated.View>
  );
}

// Round button under the deck with its name printed below (the visible name is
// also the accessible one). `big`: the ink-filled main action.
function DeckButton({ iconName, label, a11yLabel, onPress, disabled, big, wide }) {
  const t = useCollectionTheme();
  const fg = big ? t.onPrimary : t.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel || label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.buttonCell, { opacity: disabled ? 0.38 : pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          big ? styles.roundBig : styles.round,
          wide && styles.roundWide,
          big ? { backgroundColor: t.primary, borderColor: t.primary } : { backgroundColor: t.background, borderColor: t.outline },
        ]}
      >
        <Ionicons name={iconName} size={big ? 26 : icon.md + 2} color={fg} />
        {wide && (
          <Text style={[font.headline, { color: fg }]} numberOfLines={1}>
            {wide}
          </Text>
        )}
      </View>
      <Text style={[font.caption, { color: t.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// The 翻翻 tab: one card at a time, like a dating app. Right = 精選, left = next,
// up = add tags (the app's existing tag sheet). With the 未分類 filter it sorts
// the pile instead: right applies the top suggestion, left skips. Every action
// is undoable with ↶. The buttons do the same as the swipes and are the
// accessible path; the result is announced and shown in the status line.
// `onPick(post, done)`: open the tag sheet; call done(tagIds) when it closes.
export function DeckScreen({ posts, index, filter, onFilter, onOpen, onPick, onFeature, onSetTags, actions }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const triage = filter === UNCATEGORIZED;
  const key = filter ?? ALL;
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState('');
  const topRef = useRef(null);

  const byId = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts]);
  const matching = useMemo(() => {
    // 未分類 mode sorts the same pile the wall's 「整理未分類（N 篇）」 counts.
    const readable = posts.filter(triage ? (p) => p.status === 'ready' : isBrowsable);
    return (filter ? filterPosts(readable, [filter], '', index) : readable).map((p) => p.id);
  }, [posts, filter, index, triage]);
  const matchSet = useMemo(() => new Set(matching), [matching]);
  const isLive = useCallback((id) => matchSet.has(id), [matchSet]);

  // One deck per filter, dealt when the filter is picked (or reshuffled).
  const dealKey = `${key}#${round}`;
  const [stored, setStored] = useState(null);
  let base = stored;
  if (!base || base.dealKey !== dealKey) {
    base = { ...newDeck(key, matching, SESSION_SEED + round), dealKey };
    setStored(base);
  }
  const deck = syncDeck(base, matching);
  const setDeck = (next) => setStored({ ...next, dealKey });

  const topI = topIndex(deck, isLive);
  const underI = underIndex(deck, isLive);
  const post = topI >= 0 ? byId[deck.queue[topI]] : null;
  const under = underI >= 0 ? byId[deck.queue[underI]] : null;
  const left = remaining(deck, isLive);

  const suggestion = useMemo(() => (triage && post ? suggestTags(post, posts, index, { limit: 1 })[0] || null : null), [triage, post, posts, index]);
  const suggestionName = suggestion ? tagLabel(suggestion.tag, index.byId) : null;
  const reason = suggestion ? quickReasonText(suggestion.reasons[0]) : '';

  const say = (message) => {
    setStatus(message);
    AccessibilityInfo.announceForAccessibility?.(message);
  };

  // Runs a swipe / button for the top card.
  const run = (direction) => {
    if (!post) return;
    const kind = deckAction(direction, { triage, hasSuggestion: !!suggestion });
    const before = { featured: !!post.featured, tagIds: post.tagIds };
    if (kind === 'pick') {
      const id = post.id;
      onPick(post, (tagIds) => {
        const same = tagIds.length === before.tagIds.length && tagIds.every((x) => before.tagIds.includes(x));
        if (same) return;
        setStored((d) => d && { ...advance(syncDeck(d, matching), id, 'pick', before), dealKey: d.dealKey });
        say(actionMessage('pick'));
      });
      return;
    }
    setDeck(advance(deck, post.id, kind, before));
    if (kind === 'feature') onFeature(post.id, true);
    if (kind === 'suggest') onSetTags(post.id, [suggestion.tag.id]);
    say(actionMessage(kind, { tagName: suggestionName }));
  };

  const undo = () => {
    const back = undoDeck(deck);
    if (!back) return;
    const { record } = back;
    if (record.kind === 'feature') onFeature(record.id, record.before.featured);
    if (record.kind === 'suggest' || record.kind === 'pick') onSetTags(record.id, record.before.tagIds);
    setDeck(back.deck);
    say(actionMessage('undo'));
  };

  // Buttons fly the card out the same way a swipe does.
  const press = (direction) => {
    if (topRef.current) topRef.current.fling(direction);
    else run(direction);
  };

  const likeLabel = triage ? (suggestion ? `＋ ${suggestion.tag.name}` : '加標籤') : '精選';
  const likeIcon = triage ? null : 'heart';
  const nopeLabel = triage ? '跳過' : '下一張';
  const empty = !post;

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <ScreenHeader title="翻翻" actions={actions} />
        <TagScrollRow
          index={index}
          selected={filter ? [filter] : []}
          onChange={(ids) => {
            onFilter(ids[0] ?? null);
            setStatus('');
          }}
          bleed={GUTTER}
        />
        <View style={styles.hintRow}>
          <Text style={[font.meta, styles.flex, { color: t.mutedForeground }]}>
            {empty ? '' : deckHint({ triage, suggestion: suggestionName, reason })}
          </Text>
          {!empty && <Text style={[font.caption, styles.count, { color: t.mutedForeground }]}>剩 {left} 張</Text>}
        </View>
      </View>

      <View style={styles.deckArea}>
        {empty ? (
          <View style={styles.empty}>
            <Text style={[font.title, { color: t.foreground }]}>
              {triage ? '未分類都整理好了' : deck.queue.length ? '這一疊翻完了' : filter ? '這個標籤還沒有貼文' : '還沒有收藏'}
            </Text>
            <View style={[styles.rule, { backgroundColor: t.foreground }]} />
            <Text style={[font.body, { color: t.mutedForeground }]}>
              {triage ? '新收藏沒有標籤時會出現在這裡。' : deck.queue.length ? `${deck.queue.length} 篇都看過了。` : '從 Threads 分享貼文，或按右上角的 ＋ 貼上連結。'}
            </Text>
            {!triage && deck.queue.length > 0 && (
              <Pressable
                onPress={() => {
                  setRound((r) => r + 1);
                  say('已重新洗牌');
                }}
                accessibilityRole="button"
                style={styles.textButton}
              >
                <Ionicons name="shuffle" size={icon.md} color={t.accent} />
                <Text style={[font.label, { color: t.accent }]}>再洗一次</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {under && <SwipeCard key={under.id} post={under} index={index} top={false} />}
            <SwipeCard
              key={post.id}
              ref={topRef}
              post={post}
              index={index}
              top
              likeLabel={likeLabel}
              likeIcon={likeIcon}
              nopeLabel={nopeLabel}
              onSwipe={run}
              onOpen={onOpen}
              exits={(d) => deckAction(d, { triage, hasSuggestion: !!suggestion }) !== 'pick'}
            />
          </>
        )}
      </View>

      <Text style={[font.meta, styles.status, { color: t.mutedForeground }]} numberOfLines={1}>
        {status}
      </Text>
      <View style={styles.buttons}>
        <DeckButton iconName="arrow-undo-outline" label="復原" a11yLabel="復原上一張" onPress={undo} disabled={!deck.undo.length} />
        <DeckButton iconName="close" label={nopeLabel} onPress={() => press('left')} disabled={empty} />
        {triage && suggestion ? (
          <DeckButton
            big
            iconName="add"
            wide={suggestion.tag.name}
            label="套用建議"
            a11yLabel={`加上「${suggestionName}」`}
            onPress={() => press('right')}
            disabled={empty}
          />
        ) : (
          <DeckButton big iconName={triage ? 'pricetags-outline' : 'heart'} label={triage ? '自選標籤' : '精選'} a11yLabel={triage ? '自選標籤' : '設為精選'} onPress={() => press('right')} disabled={empty} />
        )}
        <DeckButton iconName="pricetag-outline" label="加標籤" onPress={() => press('up')} disabled={empty} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  fill: { flex: 1 },
  header: { paddingHorizontal: GUTTER, gap: space.xs },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 20 },
  count: { fontVariant: ['tabular-nums'] },
  deckArea: { flex: 1, marginHorizontal: GUTTER, marginTop: space.md },
  under: { transform: [{ translateY: 10 }, { scale: 0.96 }] },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', gap: space.md },
  rule: { width: 32, height: 2 },
  textButton: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  status: { textAlign: 'center', minHeight: 18, marginTop: space.md, paddingHorizontal: GUTTER },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: space.md, paddingTop: space.xs, paddingBottom: space.md },
  buttonCell: { alignItems: 'center', gap: space.xs, minWidth: TOUCH },
  round: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundBig: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundWide: { width: 'auto', minWidth: 64, flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg },
});
