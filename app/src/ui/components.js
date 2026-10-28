import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { summary } from '../historyModel';
import { spring, useReduceMotion } from './motion';
import { TOUCH, type, useTheme } from './theme';

// Button that reacts on press-down (not release) with a critically damped spring.
// variant: 'filled' (primary action) | 'tinted' (secondary action in a card).
export function Button({ title, icon, onPress, variant = 'filled', disabled, style }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v) => () =>
    reduce ? scale.setValue(1) : Animated.spring(scale, { toValue: v, ...spring(0.25) }).start();

  const filled = variant === 'filled';
  const color = filled ? t.onAccent : t.accent;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={to(0.96)}
      onPressOut={to(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: filled ? t.accentFill : t.accentSoft },
            { transform: [{ scale }], opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
            style,
          ]}
        >
          {icon && <Ionicons name={icon} size={20} color={color} />}
          <Text style={[type.headline, { color }]}>{title}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

// Icon-only control with a full 44×44 target and a required spoken label.
export function IconButton({ icon, label, onPress, color, size = 22, filled, disabled, style }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}
    >
      <View style={filled && [styles.iconFill, { backgroundColor: t.accentSoft }]}>
        <Ionicons name={icon} size={size} color={color || t.accent} />
      </View>
    </Pressable>
  );
}

export function Card({ children, style }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>;
}

function StatusIcon({ name, color }) {
  return <Ionicons name={name} size={30} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
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
    <View
      style={[styles.track, { backgroundColor: t.fill }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: t.accentFill },
          { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

// One card that morphs between working / done / error so the user always knows
// what is happening and what they can do next. Idle shows nothing (or the
// onboarding steps for first-time users, rendered by the screen).
export function StatusCard({ state, queued = 0, onAction }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const appear = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    if (reduce) return;
    appear.setValue(0.6);
    Animated.spring(appear, { toValue: 1, ...spring(0.35) }).start();
  }, [state.phase, reduce, appear]);

  if (state.phase === 'idle') return null;

  const animated = {
    opacity: appear,
    transform: [{ scale: appear.interpolate({ inputRange: [0.6, 1], outputRange: [0.98, 1] }) }],
  };

  let body;
  switch (state.phase) {
    case 'loading':
      body = (
        <Row icon={<ActivityIndicator color={t.secondary} />}>
          <Title>正在讀取貼文</Title>
          <Detail>找出影片與圖片…</Detail>
        </Row>
      );
      break;
    case 'saving':
      body = (
        <>
          <Row icon={<ActivityIndicator color={t.secondary} />}>
            <Title>
              正在下載 {state.done + 1} / {state.total}
            </Title>
            <Detail>完成後會存到「Threads」相簿</Detail>
          </Row>
          <ProgressBar value={state.done / state.total} />
        </>
      );
      break;
    case 'choosing':
      body = (
        <Row icon={<StatusIcon name="images-outline" color={t.accent} />}>
          <Title>選擇要下載的項目</Title>
          <Detail>這篇貼文有 {state.post.media.length} 個項目</Detail>
        </Row>
      );
      break;
    case 'done':
      body = (
        <Row icon={<StatusIcon name="checkmark-circle" color={t.success} />}>
          <Title>已存到「Threads」相簿</Title>
          <Detail>
            {summary(state)}
            {state.author ? ` · @${state.author}` : ''}
          </Detail>
        </Row>
      );
      break;
    case 'error':
      body = (
        <>
          <Row icon={<StatusIcon name="alert-circle" color={t.danger} />}>
            <Title>{state.title}</Title>
            {!!state.message && <Detail>{state.message}</Detail>}
          </Row>
          {state.action && (
            <Button
              title={state.action.label}
              icon={state.action.kind === 'login' ? 'person-circle-outline' : 'refresh'}
              variant="tinted"
              onPress={() => onAction(state.action.kind)}
              style={styles.cardAction}
            />
          )}
          {queued > 0 && (
            <Button
              title={`跳過這篇（還有 ${queued} 篇）`}
              icon="play-skip-forward-outline"
              variant="tinted"
              onPress={() => onAction('skip')}
              style={styles.cardAction}
            />
          )}
        </>
      );
      break;
    default:
      return null;
  }

  return (
    <Animated.View style={animated} accessibilityLiveRegion="polite">
      <Card>
        {body}
        {queued > 0 && state.phase !== 'error' && (
          <View style={[styles.queue, { borderTopColor: t.separator }]}>
            <Ionicons name="layers-outline" size={16} color={t.secondary} />
            <Text style={[type.footnote, { color: t.secondary }]}>還有 {queued} 篇排隊中</Text>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

// First-run guide; the screen hides it once the user has a download history.
export function Onboarding() {
  const t = useTheme();
  return (
    <Card>
      <Title>一鍵下載</Title>
      <View style={styles.steps}>
        <Step n="1" icon="share-outline" text="在 Threads 貼文點「分享」" />
        <Step n="2" icon="download-outline" text="選擇「Threads 下載」" />
        <Step n="3" icon="checkmark-circle" text="存好後自動回到 Threads" />
      </View>
      <Text style={[type.footnote, styles.stepsNote, { color: t.secondary }]}>
        找不到的話，在分享選單最右邊點「更多」。
      </Text>
    </Card>
  );
}

function Title({ children }) {
  const t = useTheme();
  return <Text style={[type.headline, { color: t.label }]}>{children}</Text>;
}

function Detail({ children }) {
  const t = useTheme();
  return <Text style={[type.subhead, { color: t.secondary }]}>{children}</Text>;
}

function Row({ icon, children }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>{children}</View>
    </View>
  );
}

function Step({ n, icon, text }) {
  const t = useTheme();
  return (
    <View style={styles.step} accessible accessibilityLabel={`第 ${n} 步：${text}`}>
      <View style={[styles.stepIcon, { backgroundColor: t.accentSoft }]}>
        <Ionicons name={icon} size={18} color={t.accent} />
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
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  iconFill: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 16 },
  cardAction: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 32, alignItems: 'center', marginRight: 12 },
  rowText: { flex: 1, gap: 2 },
  track: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  queue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  steps: { marginTop: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepsNote: { marginTop: 8 },
});
