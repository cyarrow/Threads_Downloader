import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBackupTime } from '../backupSchedule';
import { useCollection } from '../store';
import { TOUCH, font, icon, space, useCollectionTheme } from '../tokens';

const FAILED = {
  folder: '自動備份失敗：找不到資料夾，請重新選擇',
  write: '自動備份失敗：無法寫入資料夾，稍後會再試',
};
const RESULT = {
  folder: FAILED.folder,
  write: '備份失敗，請再試一次',
  picker: '無法開啟資料夾選擇',
};

function TextButton({ title, label, onPress, color, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label || title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.textButton, { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[font.label, { color }]}>{title}</Text>
    </Pressable>
  );
}

// 「自動備份」 block for the settings sheet: status line, then 選擇資料夾 / 立即備份 / 關閉.
// Failures show here only (never as toasts elsewhere).
export function BackupSettings() {
  const t = useCollectionTheme();
  const { autoBackup: b } = useCollection();
  const [message, setMessage] = useState(null);
  if (!b?.loaded) return null;
  const on = !!b.folderUri;

  const act = async (fn) => {
    setMessage(null);
    const res = await fn();
    if (RESULT[res]) setMessage(RESULT[res]);
    else if (res === 'ok') setMessage('已備份');
  };

  const failure = on && b.error ? FAILED[b.error] : null;
  // Inline result of the last tap, unless it's the same failure the status already shows.
  const note = message && message !== failure ? message : null;
  let status;
  if (!on) status = '每天把收藏存一份到你選的資料夾，例如雲端硬碟同步的資料夾';
  else status = `上次備份：${formatBackupTime(b.lastAt, b.now)} · ${b.folderLabel}`;

  return (
    <View style={[styles.block, { borderColor: t.border }]}>
      <View style={styles.head}>
        <Ionicons name={on ? 'cloud-done-outline' : 'cloud-upload-outline'} size={icon.lg} color={t.foreground} />
        <Text style={[font.body, { color: t.foreground, flex: 1 }]} accessibilityRole="header">
          自動備份
        </Text>
        {b.busy ? (
          <ActivityIndicator size="small" color={t.mutedForeground} accessibilityLabel="備份中" />
        ) : (
          <Text style={[font.meta, { color: t.mutedForeground }]}>{on ? '每天' : '關閉'}</Text>
        )}
      </View>
      <View style={styles.body} accessibilityLiveRegion="polite">
        {failure ? (
          <View style={styles.line}>
            <Ionicons name="alert-circle" size={icon.sm} color={t.danger} style={styles.lineIcon} />
            <Text style={[font.meta, { color: t.danger, flex: 1 }]}>{failure}</Text>
          </View>
        ) : (
          <Text style={[font.meta, { color: t.mutedForeground }]}>{status}</Text>
        )}
        {!on && b.reminder.settings && (
          <View style={styles.line}>
            <Ionicons name="time-outline" size={icon.sm} color={t.foreground} style={styles.lineIcon} />
            <Text style={[font.meta, { color: t.foreground, flex: 1 }]}>
              {b.reminder.never ? `${b.reminder.count} 篇收藏還沒有備份過` : '已經超過 30 天沒有備份了'}
            </Text>
          </View>
        )}
        {note && <Text style={[font.meta, { color: note === '已備份' ? t.mutedForeground : t.danger }]}>{note}</Text>}
        <View style={styles.actions}>
          <TextButton
            title={on && !failure ? '換資料夾' : '選擇資料夾'}
            color={t.accent}
            disabled={b.busy}
            onPress={() => act(b.chooseFolder)}
          />
          {on && <TextButton title="立即備份" color={t.accent} disabled={b.busy} onPress={() => act(b.backupNow)} />}
          {on && (
            <TextButton
              title="關閉"
              label="關閉自動備份"
              color={t.mutedForeground}
              disabled={b.busy}
              onPress={() => {
                setMessage(null);
                b.turnOff();
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const ICON_COLUMN = icon.lg + space.lg; // lines up with the settings rows' labels

const styles = StyleSheet.create({
  block: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    marginVertical: space.xs,
  },
  head: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.lg },
  body: { paddingLeft: ICON_COLUMN, gap: space.xs },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  lineIcon: { marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -space.sm },
  textButton: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: 'center', paddingHorizontal: space.sm },
});
