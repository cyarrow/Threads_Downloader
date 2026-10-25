import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { summary } from '../historyModel';
import { spring, useReduceMotion } from './motion';
import { type, useTheme } from './theme';

// Button that reacts on press-down (not release) with a critically damped spring.
export function Button({ title, onPress, variant = 'filled', disabled, style }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v) => () =>
    reduce ? scale.setValue(1) : Animated.spring(scale, { toValue: v, ...spring(0.25) }).start();

  const filled = variant === 'filled';
  return (
    <Pressable
      onPress={onPress}
      onPressIn={to(0.96)}
      onPressOut={to(1)}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={8}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            filled ? { backgroundColor: t.accent } : { backgroundColor: t.fill },
            { transform: [{ scale }], opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
            style,
          ]}
        >
          <Text style={[type.headline, { color: filled ? t.onAccent : t.accent }]}>{title}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>;
}

function Badge({ color, glyph }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeGlyph}>{glyph}</Text>
    </View>
  );
}

function ProgressBar({ value }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const width = useState(() => new Animated.Value(value))[0];
  useEffect(() => {
    // Animate from wherever the bar is now; never jump back to zero.
    const anim = reduce
      ? Animated.timing(width, { toValue: value, duration: 0, useNativeDriver: false })
      : Animated.spring(width, { toValue: value, ...spring(0.4), useNativeDriver: false });
    anim.start();
  }, [value, reduce, width]);
  return (
    <View style={[styles.track, { backgroundColor: t.fill }]}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: t.accent },
          { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

// One card that morphs between idle / working / done / error so the user always
// knows what is happening and what they can do next.
export function StatusCard({ state, onAction }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const appear = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    if (reduce) return;
    appear.setValue(0.6);
    Animated.spring(appear, { toValue: 1, ...spring(0.35) }).start();
  }, [state.phase, reduce, appear]);

  const animated = {
    opacity: appear,
    transform: [{ scale: appear.interpolate({ inputRange: [0.6, 1], outputRange: [0.98, 1] }) }],
  };

  let body;
  switch (state.phase) {
    case 'loading':
      body = (
        <Row icon={<ActivityIndicator color={t.secondary} />}>
          <Text style={[type.headline, { color: t.label }]}>正在讀取貼文</Text>
          <Text style={[type.subhead, { color: t.secondary }]}>找出影片與圖片…</Text>
        </Row>
      );
      break;
    case 'saving':
      body = (
        <>
          <Row icon={<ActivityIndicator color={t.secondary} />}>
            <Text style={[type.headline, { color: t.label }]}>
              正在下載 {state.done + 1} / {state.total}
            </Text>
            <Text style={[type.subhead, { color: t.secondary }]}>完成後會存到相簿</Text>
          </Row>
          <ProgressBar value={state.done / state.total} />
        </>
      );
      break;
    case 'choosing':
      body = (
        <Row icon={<ActivityIndicator color={t.secondary} />}>
          <Text style={[type.headline, { color: t.label }]}>選擇要下載的項目</Text>
          <Text style={[type.subhead, { color: t.secondary }]}>
            這篇貼文有 {state.post.media.length} 個項目
          </Text>
        </Row>
      );
      break;
    case 'done':
      body = (
        <Row icon={<Badge color={t.success} glyph="✓" />}>
          <Text style={[type.headline, { color: t.label }]}>已存到「Threads」相簿</Text>
          <Text style={[type.subhead, { color: t.secondary }]}>
            {summary(state)}
            {state.author ? ` · @${state.author}` : ''}
          </Text>
        </Row>
      );
      break;
    case 'error':
      body = (
        <>
          <Row icon={<Badge color={t.danger} glyph="!" />}>
            <Text style={[type.headline, { color: t.label }]}>{state.title}</Text>
            {!!state.message && (
              <Text style={[type.subhead, { color: t.secondary }]}>{state.message}</Text>
            )}
          </Row>
          {state.action && (
            <Button
              title={state.action.label}
              variant="tinted"
              onPress={() => onAction(state.action.kind)}
              style={styles.cardAction}
            />
          )}
        </>
      );
      break;
    default:
      body = (
        <>
          <Text style={[type.headline, { color: t.label, marginBottom: 12 }]}>一鍵下載</Text>
          <Step n="1" text="在 Threads 貼文點「分享」" />
          <Step n="2" text="選擇「Threads 下載」" />
          <Step n="3" text="存好後自動回到 Threads" />
        </>
      );
  }

  return (
    <Animated.View style={animated}>
      <Card>{body}</Card>
    </Animated.View>
  );
}

function Row({ icon, children }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>{children}</View>
    </View>
  );
}

function Step({ n, text }) {
  const t = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: t.fill }]}>
        <Text style={[type.footnote, { color: t.accent, fontWeight: '600' }]}>{n}</Text>
      </View>
      <Text style={[type.body, { color: t.label, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: 16, padding: 16 },
  cardAction: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 32, alignItems: 'center', marginRight: 12 },
  rowText: { flex: 1, gap: 2 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeGlyph: { color: '#fff', fontSize: 16, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
