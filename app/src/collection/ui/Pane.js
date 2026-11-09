import { Platform, StyleSheet, View } from 'react-native';

// A tab (or a page inside one) kept mounted while hidden, so its scroll
// position and state survive. It keeps its size either way: native moves it off
// screen (display: none can make native lists lose their scroll offset), web
// lays it over the visible one with visibility: hidden (in a display: none pane
// FlashList measures every card as 0 px tall and mounts the whole list, seconds
// of work with a few thousand posts; see e2e/perf.cjs). Hidden panes are removed
// from the accessibility tree either way.
export function Pane({ hidden, children }) {
  return (
    <View
      style={hidden ? styles.hidden : styles.fill}
      pointerEvents={hidden ? 'none' : 'auto'}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: Platform.select({
    web: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', visibility: 'hidden' },
    default: { position: 'absolute', top: 100000, left: 0, width: '100%', height: '100%', opacity: 0 },
  }),
});
