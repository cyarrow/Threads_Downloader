import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCollection } from '../store';
import { TOUCH, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton } from './base';

// Small dismissible note for the wall's banner slot: shown at most once per 30 days
// when auto backup is off, there are ≥20 posts and no backup for 30 days
// (decided in backupSchedule.js). `onSetup` opens settings.
export function BackupNote({ onSetup }) {
  const t = useCollectionTheme();
  const { autoBackup: b } = useCollection();
  if (!b?.wallNote) return null;
  const text = b.reminder.never ? `${b.reminder.count} 篇收藏還沒備份過` : '收藏超過 30 天沒備份';
  return (
    <View style={[styles.note, { borderColor: t.border }]}>
      <Ionicons name="time-outline" size={icon.md} color={t.foreground} />
      <Text style={[font.meta, { color: t.foreground, flex: 1 }]}>{text}</Text>
      <Pressable
        onPress={() => {
          b.dismissWallNote();
          onSetup?.();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[font.label, { color: t.accent }]}>開啟自動備份</Text>
      </Pressable>
      <IconButton name="close" label="關閉備份提醒" color={t.mutedForeground} size={icon.md} onPress={b.dismissWallNote} />
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.sm,
    paddingLeft: space.md,
  },
  action: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.xs },
});
