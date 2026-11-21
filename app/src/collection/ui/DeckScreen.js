import { memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EASE_OUT, SPRING_SETTLE, useReduceMotion } from '../../ui/motion';
import { useLatestCallback } from '../useLatestCallback';
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
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { ScreenHeader } from './HeaderActions';
import { DeckCard } from './DeckCard';
import { TagScrollRow } from './TagScrollRow';

const GUTTER = 20;
// Shuffle seed for this app session: the order stays put while the app is open;
// 再洗一次 deals the next one.
const SESSION_SEED = Date.now() % 100000;

// The draggable top card. Follows the finger (on the UI thread), tilts with the
// horizontal offset, fades a stamp in, and on release either flies off (and then
// reports the direction) or springs back carrying the finger's velocity. Where it
// goes is decided by where the flick was heading, so a quick short flick commits.
// A tap (no movement) opens the post. With reduced motion there is no fly-out:
// the action happens and the next card is just there.
// `drag`: shared value the top card writes (0 at rest, 1 off screen) so the card
// underneath can rise into place as this one leaves.
// `ref.fling(direction)`: the same exit for the buttons under the deck.
// `exits(direction)`: whether that direction removes the card (fly) or not.
function SwipeCard({ ref, post, index, top, drag, likeLabel, likeIcon, nopeLabel, onSwipe, onOpen, onAuthor, exits }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const locked = useSharedValue(false); // flying out: ignore the finger
  // Set when a drag takes over, so the click a browser still fires at the end
  // of a mouse drag doesn't also open the post (native cancels the press itself).
  // The flag arrives from the UI thread asynchronously, so `wasDrag` also asks
  // the card itself: a card that is off its resting place or flying out was
  // dragged, whatever the order of the events.
  const dragged = useRef(false);
  const wasDrag = () => dragged.current || locked.get() || Math.abs(x.get()) > TAP_SLOP || Math.abs(y.get()) > TAP_SLOP;

  const springBack = (vx = 0, vy = 0) => {
    if (reduce) {
      x.set(0);
      y.set(0);
      return;
    }
    x.set(withSpring(0, { ...SPRING_SETTLE, velocity: vx }));
    y.set(withSpring(0, { ...SPRING_SETTLE, velocity: vy }));
  };

  const fling = useLatestCallback((direction, vx = 0, vy = 0) => {
    if (locked.get()) return;
    // Only a card that actually leaves the deck flies out; one that opens the
    // tag sheet (up, or right in 未分類 without a suggestion) comes back.
    if (reduce || !exits?.(direction)) {
      springBack(vx, vy);
      onSwipe(direction);
      return;
    }
    locked.set(true);
    const done = () => {
      locked.set(false);
      onSwipe(direction);
    };
    const leave = { duration: 200, easing: EASE_OUT };
    const finish = (finished) => {
      'worklet';
      if (finished) scheduleOnRN(done);
    };
    if (direction === 'up') {
      y.set(withTiming(-height * 1.2, leave, finish));
    } else {
      x.set(withTiming(direction === 'right' ? width * 1.3 : -width * 1.3, leave, finish));
      y.set(withTiming(y.get() + 40, leave));
    }
  });
  useImperativeHandle(ref, () => ({ fling }), [fling]);

  const markDragged = useCallback(() => {
    dragged.current = true;
  }, []);
  const release = useLatestCallback((dx, dy, vx, vy) => {
    const direction = releaseDirection(dx, dy, vx, vy);
    if (direction === 'right' || direction === 'left' || direction === 'up') fling(direction, vx, vy);
    else springBack(vx, vy);
  });

  const pan = usePanGesture({
    enabled: top,
    minDistance: TAP_SLOP,
    onActivate: () => {
      'worklet';
      if (locked.get()) return;
      // Grabbing the card mid-spring continues from where it is, not from 0.
      cancelAnimation(x);
      cancelAnimation(y);
      startX.set(x.get());
      startY.set(y.get());
      scheduleOnRN(markDragged);
    },
    onUpdate: (e) => {
      'worklet';
      if (locked.get()) return;
      x.set(startX.get() + e.translationX);
      y.set(startY.get() + e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      if (locked.get()) return;
      scheduleOnRN(release, x.get(), y.get(), e.velocityX, e.velocityY);
    },
  });

  // The top card reports how far it has gone; the card underneath reads it.
  useAnimatedReaction(
    () => (top ? Math.min(1, Math.max(Math.abs(x.get()) / width, Math.abs(y.get()) / height) / 0.6) : -1),
    (progress) => {
      if (progress >= 0) drag.set(progress);
    },
    [top, width, height],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { rotate: reduce ? '0deg' : `${interpolate(x.get(), [-width, 0, width], [-14, 0, 14])}deg` },
    ],
  }));
  // Behind the top card: a little lower and smaller, growing into place as the
  // top card is dragged away, so the next card never jumps when it takes over.
  const underStyle = useAnimatedStyle(() => {
    const p = reduce ? 0 : drag.get();
    return { transform: [{ translateY: 10 * (1 - p) }, { scale: 0.96 + 0.04 * p }] };
  });
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, 90], [0, 1], Extrapolation.CLAMP) }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [-90, 0], [1, 0], Extrapolation.CLAMP) }));
  const caption = (post.caption || '').slice(0, 30);

  if (!top) {
    // Peeks out behind the top card; not interactive, hidden from screen readers.
    return (
      <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, underStyle]}>
        <DeckCard post={post} index={index} />
      </Animated.View>
    );
  }
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        <Pressable
          onPressIn={() => {
            dragged.current = false;
          }}
          onPress={() => !wasDrag() && onOpen(post)}
          accessibilityRole="button"
          accessibilityLabel={`@${post.author}，${caption}`}
          accessibilityHint="開啟貼文。也可以用動作選單設為精選、看下一張或加標籤"
          // Screen-reader users get the swipe directions as named actions on the card itself
          // (the buttons below the deck remain the visible single-tap alternative).
          accessibilityActions={[
            { name: 'activate' },
            { name: 'like', label: likeLabel },
            { name: 'next', label: nopeLabel },
            { name: 'tags', label: '加標籤' },
            ...(onAuthor && post.author ? [{ name: 'author', label: `看 @${post.author} 的所有收藏` }] : []),
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            const name = nativeEvent.actionName;
            if (name === 'activate') onOpen(post);
            else if (name === 'like') fling('right');
            else if (name === 'next') fling('left');
            else if (name === 'tags') fling('up');
            else if (name === 'author') onAuthor(post.author);
          }}
          style={styles.fill}
        >
          <DeckCard
            post={post}
            index={index}
            likeLabel={likeLabel}
            likeIcon={likeIcon}
            nopeLabel={nopeLabel}
            likeStyle={likeStyle}
            nopeStyle={nopeStyle}
            onAuthorPressIn={() => {
              dragged.current = false;
            }}
            onAuthor={onAuthor && post.author ? () => !wasDrag() && onAuthor(post.author) : undefined}
          />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

// Button under the deck with its name printed below (the visible name is also
// the accessible one). `big`: the ink-filled main action. Round in 雜誌; square
// in themes without rounded corners (底片, t.radius.lg 0).
function DeckButton({ iconName, label, a11yLabel, onPress, disabled, big, wide }) {
  const t = useCollectionTheme();
  const fg = big ? t.onPrimary : t.foreground;
  const square = t.radius.lg === 0 && { borderRadius: 0 };
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
          square,
          big ? { backgroundColor: t.primary, borderColor: t.primary } : { backgroundColor: t.background, borderColor: t.outline },
        ]}
      >
        <Ionicons name={iconName} size={big ? 26 : icon.md + 2} color={fg} />
        {wide && (
          <Text style={[t.font.headline, { color: fg }]} numberOfLines={1}>
            {wide}
          </Text>
        )}
      </View>
      <Text style={[t.font.caption, { color: t.mutedForeground }]} numberOfLines={1}>
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
// `onAuthor(handle)`: the top card's @handle was tapped (opens the author page).
function DeckScreenImpl({ posts, index, filter, onFilter, onOpen, onAuthor, onPick, onFeature, onSetTags, actions }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const triage = filter === UNCATEGORIZED;
  const key = filter ?? ALL;
  // How far the top card has travelled (0–1), for the card underneath.
  const drag = useSharedValue(0);
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
          <Text style={[t.font.meta, styles.flex, { color: t.mutedForeground }]}>
            {empty ? '' : deckHint({ triage, suggestion: suggestionName, reason })}
          </Text>
          {!empty && <Text style={[t.font.caption, styles.count, { color: t.mutedForeground }]}>剩 {left} 張</Text>}
        </View>
      </View>

      <View style={styles.deckArea}>
        {empty ? (
          <View style={styles.empty}>
            <Text style={[t.font.title, { color: t.foreground }]}>
              {triage ? '未分類都整理好了' : deck.queue.length ? '這一疊翻完了' : filter ? '這個標籤還沒有貼文' : '還沒有收藏'}
            </Text>
            <View style={[styles.rule, { backgroundColor: t.foreground }]} />
            <Text style={[t.font.body, { color: t.mutedForeground }]}>
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
                <Text style={[t.font.label, { color: t.accent }]}>再洗一次</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {under && <SwipeCard key={under.id} post={under} index={index} top={false} drag={drag} />}
            <SwipeCard
              key={post.id}
              ref={topRef}
              post={post}
              index={index}
              top
              drag={drag}
              likeLabel={likeLabel}
              likeIcon={likeIcon}
              nopeLabel={nopeLabel}
              onSwipe={run}
              onOpen={onOpen}
              onAuthor={onAuthor}
              exits={(d) => deckAction(d, { triage, hasSuggestion: !!suggestion }) !== 'pick'}
            />
          </>
        )}
      </View>

      <Text style={[t.font.meta, styles.status, { color: t.mutedForeground }]} numberOfLines={1}>
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

// Memoised: it stays mounted while hidden and must not re-render for every
// change in Home (a keystroke in 收藏's search); App.js keeps its props stable.
export const DeckScreen = memo(DeckScreenImpl);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  fill: { flex: 1 },
  header: { paddingHorizontal: GUTTER, gap: space.xs },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 20 },
  count: { fontVariant: ['tabular-nums'] },
  deckArea: { flex: 1, marginHorizontal: GUTTER, marginTop: space.md },
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
