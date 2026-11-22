import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EASE_OUT, EASE_OUT_CSS, SPRING_SHEET, project, rubberband, useReduceMotion } from '../../ui/motion';
import { useLatestCallback } from '../useLatestCallback';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { TagMark } from './theme/TagMark';

// How much of the view in `ref` the on-screen keyboard covers. Sheets and pages
// are edge-to-edge Modals, and on current Android the window no longer shrinks
// for the keyboard, so inputs ended up behind it. Measuring the overlap (rather
// than adding the keyboard's height) stays correct on devices that do resize:
// there the view already ends above the keyboard and the overlap is 0.
export function useKeyboardOverlap(ref) {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const top = e.endCoordinates?.screenY;
      if (!ref.current?.measureInWindow || typeof top !== 'number') return setOverlap(e.endCoordinates?.height || 0);
      ref.current.measureInWindow((x, y, w, h) => setOverlap(Math.max(0, Math.round(y + h - top))));
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ref]);
  return overlap;
}

// Haptics are a nice-to-have; never let them throw (e.g. on web).
export function buzz(kind) {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Not available on this platform.
  }
}

// Press feedback that never changes layout bounds: the box shrinks to 0.97 and dims
// a little in 120ms on a strong ease-out (a Reanimated CSS transition; no spring,
// no per-frame JS). Reduced motion keeps only the dim.
// `containerStyle` positions/sizes the touch target itself (absolute, flex…);
// `style` is the visual box that scales. Layout must live on the container, or
// the touch target collapses to 0×0 and Android drops touches outside it.
// `delayPressIn`: for items inside scrolling lists — wait briefly before showing
// the press so a finger that starts a scroll doesn't make the card shrink.
const SCROLL_PRESS_DELAY_MS = 120;

export function PressScale({ children, style, containerStyle, onPress, onLongPress, disabled, delayPressIn, ...a11y }) {
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      unstable_pressDelay={delayPressIn ? SCROLL_PRESS_DELAY_MS : undefined}
      delayPressIn={delayPressIn ? SCROLL_PRESS_DELAY_MS : undefined}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      disabled={disabled}
      style={containerStyle}
      {...a11y}
    >
      <Animated.View style={[style, styles.press, pressed && (reduce ? styles.pressedDim : styles.pressed)]}>{children}</Animated.View>
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, color, size = icon.lg, disabled, selected }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: selected }}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={name} size={size} color={color || t.foreground} />
    </Pressable>
  );
}

// Tag chip: a hairline box with near-square corners (雜誌) or square ones (底片);
// the tag's hue shows only as its marker (TagMark: a small square, or a thin bar
// in 底片), so the chip row reads like a contents list.
// Selected chips fill with ink and add a checkmark (colour is never the only signal).
// variant: 'display' (read-only, compact) | 'choice' (selectable).
// `neutral` chips (全部, +N, 新增) have no colour square.
// `mixed` (批次選取's tri-state picker: only some of the selected posts have the
// tag): a dashed ink edge and a — mark, read as checked 'mixed'.
// `steady`: the marker sits in a box as wide as the ✓, so selecting never changes
// the chip's width (pickers where a chip can be selected for the user — 自動標籤規則 —
// must not reflow the chips around it).
export function TagChip({ label, hue, selected, mixed, onPress, variant = 'choice', neutral, iconName, trailingIcon, a11yLabel, expanded, steady }) {
  const t = useCollectionTheme();
  const display = variant === 'display';
  const on = selected && !display;
  const some = mixed && !on && !display;
  const text = on ? t.background : t.foreground;
  const marker = steady && !neutral && !display;
  const content = (
    <View
      style={[
        display ? styles.chipDisplay : styles.chip,
        { borderRadius: display ? t.radius.xs : t.radius.sm },
        on
          ? { backgroundColor: t.foreground, borderColor: t.foreground }
          : some
            ? { borderColor: t.foreground, borderStyle: 'dashed' }
            : { borderColor: display ? t.border : t.outline },
      ]}
    >
      {marker ? (
        <View style={styles.steadyMark}>
          {on ? <Ionicons name="checkmark" size={icon.sm} color={text} /> : some ? <Ionicons name="remove" size={icon.sm} color={text} /> : <TagMark hue={hue} size="md" />}
        </View>
      ) : (
        <>
          {on && <Ionicons name="checkmark" size={icon.sm} color={text} />}
          {some && <Ionicons name="remove" size={icon.sm} color={text} />}
          {!neutral && !on && <TagMark hue={hue} size={display ? 'sm' : 'md'} />}
        </>
      )}
      {iconName && <Ionicons name={iconName} size={icon.sm} color={text} />}
      <Text style={[display ? t.font.caption : t.font.label, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon && <Ionicons name={trailingIcon} size={icon.sm} color={text} />}
    </View>
  );
  if (display) return content;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: (TOUCH - 36) / 2, bottom: (TOUCH - 36) / 2 }}
      accessibilityRole={expanded === undefined ? 'checkbox' : 'button'}
      accessibilityState={expanded === undefined ? { checked: some ? 'mixed' : !!selected } : { expanded, selected: !!selected }}
      aria-checked={expanded === undefined ? (some ? 'mixed' : !!selected) : undefined}
      accessibilityLabel={a11yLabel || label}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {content}
    </Pressable>
  );
}

// Bottom sheet: fading scrim + panel that springs up (fades only with reduced
// motion). The handle and title row can be dragged: down follows the finger,
// up resists, and on release it closes if the flick was heading past 40% of the
// panel (velocity counts, so a quick flick is enough) or springs home.
export function Sheet({ visible, onClose, title, children, footer }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const offset = useSharedValue(0); // px below the open position
  const shown = useSharedValue(0); // panel opacity
  const panelHeight = useSharedValue(600);
  const start = useSharedValue(0);
  const rootRef = useRef(null);
  const keyboard = useKeyboardOverlap(rootRef);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (!visible) return;
    cancelAnimation(offset);
    if (reduce) {
      offset.set(0);
      shown.set(0);
      shown.set(withTiming(1, { duration: 150 }));
      return;
    }
    offset.set(60);
    shown.set(0);
    offset.set(withSpring(0, SPRING_SHEET));
    shown.set(withTiming(1, { duration: 200, easing: EASE_OUT }));
  }, [visible, reduce, offset, shown]);

  const close = useLatestCallback(() => onClose?.());
  const drag = usePanGesture({
    activeOffsetY: [-10, 10],
    onActivate: () => {
      'worklet';
      cancelAnimation(offset);
      start.set(offset.get());
    },
    onUpdate: (e) => {
      'worklet';
      const next = start.get() + e.translationY;
      offset.set(next >= 0 ? next : rubberband(next, panelHeight.get()));
    },
    onDeactivate: (e) => {
      'worklet';
      const h = panelHeight.get();
      if (offset.get() + project(e.velocityY) > h * 0.4) {
        offset.set(
          withSpring(h, { ...SPRING_SHEET, dampingRatio: 1, velocity: e.velocityY, overshootClamping: true }, (finished) => {
            'worklet';
            if (finished) scheduleOnRN(close);
          }),
        );
      } else {
        offset.set(withSpring(0, { ...SPRING_SHEET, velocity: e.velocityY }));
      }
    },
  });

  const panelMotion = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateY: offset.get() }] }));
  const scrimMotion = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, panelHeight.get()], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* A Modal is its own window on Android: gestures inside need their own root. */}
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View ref={rootRef} style={styles.sheetRoot} collapsable={false}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }, scrimMotion]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="關閉" />
          <Animated.View
            onLayout={(e) => panelHeight.set(e.nativeEvent.layout.height)}
            style={[
              styles.panel,
              {
                backgroundColor: t.card,
                borderTopLeftRadius: t.radius.sheet,
                borderTopRightRadius: t.radius.sheet,
                // With the keyboard up the panel sits right on top of it (no safe-area
                // padding under it) and shrinks so its own scroll view keeps working.
                paddingBottom: keyboard ? space.sm : insets.bottom + space.lg,
                marginBottom: keyboard,
                maxHeight: keyboard ? Math.max(200, (windowHeight - keyboard - insets.top) * 0.95) : '88%',
              },
              panelMotion,
            ]}
          >
            <GestureDetector gesture={drag}>
              <View collapsable={false}>
                <View style={[styles.handle, { backgroundColor: t.border }]} />
                {title && (
                  // Like a column heading: WenKai title sitting on a hairline rule.
                  <View style={[styles.sheetHeader, { borderBottomColor: t.border }]}>
                    <Text style={[t.font.title, { color: t.foreground, flex: 1 }]} accessibilityRole="header">
                      {title}
                    </Text>
                    <IconButton name="close" label="關閉" onPress={onClose} color={t.mutedForeground} />
                  </View>
                )}
              </View>
            </GestureDetector>
            {children}
            {footer}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Buttons: ink-filled primary and hairline-outlined secondary, with the same
// corners as the tag chips (t.radius.sm) so a row of actions reads as one set.
export function PrimaryButton({ title, iconName, onPress, disabled }) {
  const t = useCollectionTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.primary, { backgroundColor: t.primary, borderRadius: t.radius.sm, opacity: disabled ? 0.45 : 1 }]}
    >
      {iconName && <Ionicons name={iconName} size={icon.md} color={t.onPrimary} />}
      <Text style={[t.font.headline, styles.primaryText, { color: t.onPrimary }]}>{title}</Text>
    </PressScale>
  );
}

export function SecondaryButton({ title, iconName, onPress, danger }) {
  const t = useCollectionTheme();
  const color = danger ? t.danger : t.foreground;
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      containerStyle={styles.flex}
      style={[styles.secondary, { borderColor: t.outline, borderRadius: t.radius.sm }]}
    >
      {iconName && <Ionicons name={iconName} size={icon.md} color={color} />}
      <Text style={[t.font.label, { color }]}>{title}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  iconButton: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  steadyMark: { width: icon.sm, alignItems: 'center', justifyContent: 'center' },
  chipDisplay: {
    height: 24,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
  },
  gestureRoot: { flex: 1 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  press: {
    transform: [{ scale: 1 }],
    opacity: 1,
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: 120,
    transitionTimingFunction: EASE_OUT_CSS,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  pressedDim: { opacity: 0.9 },
  panel: {
    maxHeight: '88%',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, marginBottom: space.sm },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  primary: {
    minHeight: 52,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  primaryText: { letterSpacing: 1 },
  secondary: {
    minHeight: TOUCH,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  flex: { flex: 1 },
});
