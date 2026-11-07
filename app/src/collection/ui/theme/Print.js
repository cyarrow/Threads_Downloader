import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatImprint } from '../../themes';
import { useCollectionTheme } from '../../tokens';

// Paper edge of a print: even on three sides, a little deeper at the bottom.
export const PRINT_EDGE = 6;
export const PRINT_EDGE_BOTTOM = 8;
// Horizontal space a print takes beyond its photo (for screens sizing a pager).
export const PRINT_INSET = PRINT_EDGE * 2;

// Orange date imprint, like a film camera's, from a timestamp (use the post's
// savedAt). A soft glow keeps it readable on light and busy photos. Decorative
// for screen readers: say the date in the screen's own words if it matters.
export function DateImprint({ at, style }) {
  const t = useCollectionTheme();
  const text = formatImprint(at);
  if (!text) return null;
  return (
    <Text
      style={[t.font.imprint, styles.glow, { color: t.stamp, textShadowColor: t.stampGlow }, style]}
      maxFontSizeMultiplier={1.3}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {text}
    </Text>
  );
}

// Small label in a photo's corner: ▶ 影片 (bottom left) or N 張 (top right).
export function PrintLabel({ kind, count }) {
  const t = useCollectionTheme();
  if (kind !== 'video' && !(kind === 'multi' && count > 1)) return null;
  const video = kind === 'video';
  return (
    <View
      style={[styles.label, video ? styles.labelBottomLeft : styles.labelTopRight, { backgroundColor: t.badge }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {video && <Ionicons name="play" size={10} color={t.onBadge} />}
      <Text style={[t.font.caption, { color: t.onBadge }]} maxFontSizeMultiplier={1.3}>
        {video ? '影片' : `${count} 張`}
      </Text>
    </View>
  );
}

// A photo shown as a print in themes with `t.printFrame` (底片): paper edge,
// a soft shadow, square corners, the savedAt date imprint bottom right and an
// optional ▶ 影片 / N 張 label. In 雜誌 nothing is printed over a photo, so it just
// clips the photo to the theme's small corner radius.
// Children fill the inner box (give the image width '100%' and an aspect ratio,
// or an explicit size). `imprint={false}` hides the date (e.g. while a video plays
// under native controls). `kind`: 'video' | 'multi' | null, with `count`.
// `note`: the user's note (one line), written by hand on the bottom edge, which
// grows to hold it (底片 only; 雜誌 shows notes under the card instead).
export function Print({ savedAt, kind, count, imprint = true, note, style, children }) {
  const t = useCollectionTheme();
  if (!t.printFrame) {
    return <View style={[{ borderRadius: t.radius.xs, overflow: 'hidden' }, style]}>{children}</View>;
  }
  return (
    <View style={[styles.frame, { backgroundColor: t.edge }, style]}>
      <View style={styles.inner}>
        {children}
        <PrintLabel kind={kind} count={count} />
        {imprint && (
          <View style={styles.imprint} pointerEvents="none">
            <DateImprint at={savedAt} />
          </View>
        )}
      </View>
      {!!note && (
        <Text style={[t.font.hand, styles.note, { color: t.onEdge }]} numberOfLines={1} accessibilityElementsHidden importantForAccessibility="no">
          {note}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: PRINT_EDGE,
    paddingBottom: PRINT_EDGE_BOTTOM,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.18)',
  },
  inner: { overflow: 'hidden' },
  // Handwriting on the wide bottom edge, like a caption on an instant photo.
  note: { paddingTop: 5, paddingHorizontal: 2, marginBottom: -2 },
  glow: { textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  imprint: { position: 'absolute', right: 8, bottom: 6 },
  label: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  labelBottomLeft: { left: 6, bottom: 6 },
  labelTopRight: { right: 6, top: 6 },
});
