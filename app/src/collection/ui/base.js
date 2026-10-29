import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spring, useReduceMotion } from '../../ui/motion';
import { TOUCH, font, icon, radius, space, tagColors, useCollectionTheme } from '../tokens';

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

// Press feedback that never changes layout bounds: a 0.97 spring scale plus opacity.
// `containerStyle` positions/sizes the touch target itself (absolute, flex…);
// `style` is the visual box that scales. Layout must live on the container, or
// the touch target collapses to 0×0 and Android drops touches outside it.
// `delayPressIn`: for items inside scrolling lists — wait briefly before showing
// the press so a finger that starts a scroll doesn't make the card shrink.
const SCROLL_PRESS_DELAY_MS = 90;

export function PressScale({ children, style, containerStyle, onPress, onLongPress, disabled, delayPressIn, ...a11y }) {
  const reduce = useReduceMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v) => () => {
    if (!reduce) Animated.spring(scale, { toValue: v, ...spring(0.25) }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      unstable_pressDelay={delayPressIn ? SCROLL_PRESS_DELAY_MS : undefined}
      delayPressIn={delayPressIn ? SCROLL_PRESS_DELAY_MS : undefined}
      onPressIn={to(0.97)}
      onPressOut={to(1)}
      disabled={disabled}
      style={containerStyle}
      {...a11y}
    >
      {({ pressed }) => (
        <Animated.View style={[style, { transform: [{ scale }], opacity: pressed ? 0.9 : 1 }]}>
          {children}
        </Animated.View>
      )}
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

// Tag chip. variant: 'display' (read-only, compact) | 'choice' (selectable).
// `neutral` chips (全部, +N, 新增) use foreground/field colors instead of a tag hue.
export function TagChip({ label, hue, selected, onPress, variant = 'choice', neutral, iconName, trailingIcon, a11yLabel, expanded }) {
  const t = useCollectionTheme();
  const c = neutral
    ? selected
      ? { bg: t.foreground, text: t.background }
      : { bg: t.field, text: t.foreground }
    : tagColors(hue, t.scheme, selected);
  const display = variant === 'display';
  const content = (
    <View style={[display ? styles.chipDisplay : styles.chip, { backgroundColor: c.bg }]}>
      {selected && !display && <Ionicons name="checkmark" size={icon.sm} color={c.text} />}
      {iconName && <Ionicons name={iconName} size={icon.sm} color={c.text} />}
      <Text style={[display ? font.caption : font.label, { color: c.text }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon && <Ionicons name={trailingIcon} size={icon.sm} color={c.text} />}
    </View>
  );
  if (display) return content;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: (TOUCH - 36) / 2, bottom: (TOUCH - 36) / 2 }}
      accessibilityRole={expanded === undefined ? 'checkbox' : 'button'}
      accessibilityState={expanded === undefined ? { checked: !!selected } : { expanded, selected: !!selected }}
      accessibilityLabel={a11yLabel || label}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {content}
    </Pressable>
  );
}

// Bottom sheet: fading scrim + panel that springs up (fades only with reduced motion).
export function Sheet({ visible, onClose, title, children, footer }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const enter = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    if (reduce) Animated.timing(enter, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    else Animated.spring(enter, { toValue: 1, ...spring(0.35, 0.9) }).start();
  }, [visible, reduce, enter]);

  const panelMotion = {
    opacity: enter,
    transform: reduce ? [] : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="關閉" />
        <Animated.View style={[styles.panel, { backgroundColor: t.card, paddingBottom: insets.bottom + space.lg }, panelMotion]}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          {title && (
            <View style={styles.sheetHeader}>
              <Text style={[font.title, { color: t.foreground, flex: 1 }]} accessibilityRole="header">
                {title}
              </Text>
              <IconButton name="close" label="關閉" onPress={onClose} color={t.mutedForeground} />
            </View>
          )}
          {children}
          {footer}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function PrimaryButton({ title, iconName, onPress, disabled }) {
  const t = useCollectionTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.primary, { backgroundColor: t.primary, opacity: disabled ? 0.45 : 1 }]}
    >
      {iconName && <Ionicons name={iconName} size={icon.md} color={t.onPrimary} />}
      <Text style={[font.headline, { color: t.onPrimary }]}>{title}</Text>
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
      style={[styles.secondary, { backgroundColor: t.field }]}
    >
      {iconName && <Ionicons name={iconName} size={icon.md} color={color} />}
      <Text style={[font.label, { color }]}>{title}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  iconButton: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  chipDisplay: {
    height: 24,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: space.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  primary: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  secondary: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  flex: { flex: 1 },
});
