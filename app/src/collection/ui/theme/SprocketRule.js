import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCollectionTheme } from '../../tokens';

const HOLE = 5;

// A strip of 35mm film: a dark band with a row of perforations, used by 底片 as
// the rule under a masthead. Decorative (hidden from screen readers). Holes are
// spaced evenly across whatever width the strip gets.
export function SprocketRule({ height = 10, pitch = 14, style }) {
  const t = useCollectionTheme();
  const [width, setWidth] = useState(0);
  const count = Math.max(0, Math.floor(width / pitch));
  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[styles.strip, { height, backgroundColor: t.sprocket }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.hole, { backgroundColor: t.sprocketHole }]} />
      ))}
    </View>
  );
}

// The rule under a screen's masthead in the current theme: a 2px ink line (雜誌)
// or a sprocket strip (底片).
export function MastheadRule({ style }) {
  const t = useCollectionTheme();
  if (t.rule === 'sprocket') return <SprocketRule style={style} />;
  return <View style={[styles.line, { backgroundColor: t.foreground }, style]} />;
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
  hole: { width: HOLE, height: HOLE, borderRadius: HOLE / 2 },
  line: { height: 2 },
});
