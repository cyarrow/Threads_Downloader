import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from './components';
import { type, useTheme } from './theme';

// Shown when GitHub has a newer APK. Downloading opens the browser; Android then
// offers to install it over the current version (same signing key).
export function UpdateCard({ release, onDismiss }) {
  const t = useTheme();
  if (!release) return null;
  const notes = release.notes.split('\n')[0];
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.textCol}>
          <Text style={[type.headline, { color: t.label }]}>有新版本</Text>
          <Text style={[type.subhead, { color: t.secondary }]} numberOfLines={2}>
            {release.name}
            {notes ? `：${notes}` : ''}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="稍後再說">
          <Text style={[type.body, { color: t.tertiary }]}>✕</Text>
        </Pressable>
      </View>
      <Button title="下載更新" onPress={() => Linking.openURL(release.apkUrl)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  textCol: { flex: 1, gap: 2 },
});
