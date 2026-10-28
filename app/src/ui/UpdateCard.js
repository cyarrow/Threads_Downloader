import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconButton } from './components';
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
        <Ionicons name="arrow-up-circle" size={30} color={t.accent} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={[type.headline, { color: t.label }]}>有新版本</Text>
          <Text style={[type.subhead, { color: t.secondary }]} numberOfLines={2}>
            {release.name}
            {notes ? `：${notes}` : ''}
          </Text>
        </View>
        <IconButton icon="close" label="稍後再說" color={t.secondary} onPress={onDismiss} style={styles.close} />
      </View>
      <Button title="下載更新" icon="download-outline" onPress={() => Linking.openURL(release.apkUrl)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { marginTop: 2 },
  textCol: { flex: 1, gap: 2 },
  close: { marginTop: -10, marginRight: -10 },
});
