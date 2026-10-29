import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { isLoggedInUrl } from '../../threads';
import { imageSource } from '../media';
import { TOUCH, elevation, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet } from './base';

const LOGIN_URL = 'https://www.threads.com/login';

// Full-height page for logging in to Threads; closes itself once Threads lands
// on a regular page (meaning the session is logged in).
export function LoginSheet({ visible, onClose, onLoggedIn }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: t.card, paddingBottom: insets.bottom }]}>
        <View style={[styles.pageHeader, { borderBottomColor: t.border }]}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.headerButton}>
            <Text style={[font.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[font.title, { color: t.foreground }]} accessibilityRole="header">
            登入 Threads
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={t.mutedForeground} />
          <Text style={[font.meta, { color: t.mutedForeground, flex: 1 }]}>
            登入只會保存在這支手機上，用來讀取你看得到的貼文。
          </Text>
        </View>
        {visible && Platform.OS !== 'web' && (
          <WebView
            source={{ uri: LOGIN_URL }}
            onNavigationStateChange={({ url, loading }) => {
              if (!loading && isLoggedInUrl(url)) onLoggedIn();
            }}
            sharedCookiesEnabled
            style={styles.flex}
          />
        )}
      </View>
    </Modal>
  );
}

// Paste a link by hand (the + button opens this when the clipboard has no link).
export function AddLinkSheet({ visible, onClose, onSubmit }) {
  const t = useCollectionTheme();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const submit = async (value = text) => {
    const result = await onSubmit(value);
    if (result === 'invalid') setError(value.trim() ? '這不是 Threads 貼文連結' : '請貼上貼文連結');
    else {
      setText('');
      setError(null);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="收藏貼文">
      <View style={styles.form}>
        <Text nativeID="addLinkLabel" style={[font.label, { color: t.foreground }]}>貼文連結</Text>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError(null);
          }}
          onSubmitEditing={() => submit()}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          placeholder="https://www.threads.com/…"
          placeholderTextColor={t.mutedForeground}
          accessibilityLabel="貼文連結"
          accessibilityLabelledBy="addLinkLabel"
          style={[font.body, styles.input, { color: t.foreground, backgroundColor: t.field, borderColor: error ? t.danger : t.field }]}
        />
        {error ? (
          <View style={styles.inline} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
            <Text style={[font.meta, { color: t.danger }]}>{error}</Text>
          </View>
        ) : (
          <Text style={[font.meta, { color: t.mutedForeground }]}>支援貼文連結與 Threads App 的分享連結</Text>
        )}
        <View style={styles.row}>
          <SecondaryButton
            title="從剪貼簿貼上"
            iconName="clipboard-outline"
            onPress={async () => {
              const clip = await Clipboard.getStringAsync();
              setText(clip);
              submit(clip);
            }}
          />
        </View>
        <PrimaryButton title="收藏" iconName="bookmark-outline" onPress={() => submit()} disabled={!text.trim()} />
      </View>
    </Sheet>
  );
}

// Lets the user choose which items of a multi-item post to download.
export function DownloadPickerSheet({ post, onConfirm, onCancel }) {
  const t = useCollectionTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState(() => (post ? post.media.map((_, i) => i) : []));
  if (!post) return null;
  const size = (width - space.lg * 2 - space.xs * 2) / 3;
  const all = selected.length === post.media.length;
  const toggle = (i) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));
  return (
    <Sheet visible onClose={onCancel} title={`下載哪幾項？（已選 ${selected.length}/${post.media.length}）`}>
      <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.grid}>
        {post.media.map((m, i) => {
          const on = selected.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => toggle(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`第 ${i + 1} 項，${m.type === 'video' ? '影片' : '圖片'}`}
              style={{ width: size, height: size }}
            >
              <Image source={imageSource(m.thumb || m.poster)} style={[styles.tile, { backgroundColor: t.muted }]} contentFit="cover" />
              {!on && <View style={[styles.tile, styles.dim, { backgroundColor: t.background }]} />}
              {on && <View style={[styles.tile, styles.ring, { borderColor: t.primary }]} />}
              {m.type === 'video' && (
                <View style={[styles.tileBadge, { backgroundColor: t.badge }]}>
                  <Ionicons name="play" size={12} color={t.onBadge} />
                </View>
              )}
              <View style={[styles.check, { borderColor: t.onBadge, backgroundColor: on ? t.primary : t.badge }]}>
                {on && <Ionicons name="checkmark" size={16} color={t.onPrimary} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.pickerFooter}>
        <Pressable
          onPress={() => setSelected(all ? [] : post.media.map((_, i) => i))}
          accessibilityRole="button"
          style={styles.textButton}
        >
          <Text style={[font.label, { color: t.accent }]}>{all ? '全不選' : '全選'}</Text>
        </Pressable>
        <View style={styles.flex}>
          <PrimaryButton
            title={selected.length ? `下載 ${selected.length} 項` : '請至少選一項'}
            iconName={selected.length ? 'download-outline' : undefined}
            disabled={!selected.length}
            onPress={() => onConfirm(selected)}
          />
        </View>
      </View>
    </Sheet>
  );
}

// Floating status for downloads; tap to retry/log in when something failed,
// or ✕ to skip it and move on to the next queued post.
export function DownloadPill({ state, queued, onAction, onSkip }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  const working = ['loading', 'saving', 'choosing'].includes(state.phase);
  if (!working && state.phase !== 'error') return null;
  let label;
  if (state.phase === 'loading') label = '讀取貼文中…';
  else if (state.phase === 'choosing') label = '選擇要下載的項目';
  else if (state.phase === 'saving') label = `下載中 ${state.done + 1}/${state.total}`;
  else label = state.action?.kind === 'login' ? '下載需要登入 · 點這裡登入' : `${state.title} · 點這裡重試`;
  if (queued > 0 && working) label += `（還有 ${queued} 篇）`;
  return (
    <View
      style={[styles.pill, elevation.level2, { backgroundColor: t.foreground, bottom: insets.bottom + space.lg + 4 }]}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={state.phase === 'error' ? () => onAction(state.action?.kind || 'retry') : undefined}
        disabled={state.phase !== 'error'}
        accessibilityRole={state.phase === 'error' ? 'button' : 'text'}
        style={styles.pillMain}
      >
        {working ? (
          <ActivityIndicator color={t.background} size="small" />
        ) : (
          <Ionicons name="alert-circle" size={icon.md} color={t.background} />
        )}
        <Text style={[font.label, { color: t.background, flexShrink: 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {state.phase === 'error' && (
        <IconButton name="close" label="略過這篇" color={t.background} size={icon.md} onPress={onSkip} />
      )}
    </View>
  );
}

export function UpdateBanner({ release, onDownload, onDismiss }) {
  const t = useCollectionTheme();
  if (!release) return null;
  return (
    <View style={[styles.banner, { backgroundColor: t.card, borderColor: t.border }]}>
      <Ionicons name="arrow-up-circle" size={icon.lg} color={t.foreground} />
      <View style={styles.flex}>
        <Text style={[font.label, { color: t.foreground }]}>有新版本</Text>
        <Text style={[font.meta, { color: t.mutedForeground }]} numberOfLines={1}>
          {release.name}
        </Text>
      </View>
      <Pressable onPress={onDownload} accessibilityRole="button" style={styles.textButton}>
        <Text style={[font.label, { color: t.accent }]}>下載更新</Text>
      </Pressable>
      <IconButton name="close" label="稍後再說" color={t.mutedForeground} size={icon.md} onPress={onDismiss} />
    </View>
  );
}

function SettingsRow({ iconName, label, value, onPress }) {
  const t = useCollectionTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [styles.settingsRow, pressed && onPress && { backgroundColor: t.muted }]}
    >
      <Ionicons name={iconName} size={icon.lg} color={t.foreground} />
      <Text style={[font.body, { color: t.foreground, flex: 1 }]}>{label}</Text>
      {!!value && (
        <Text style={[font.meta, { color: t.mutedForeground, flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
      )}
      {onPress && <Ionicons name="chevron-forward" size={icon.sm} color={t.mutedForeground} />}
    </Pressable>
  );
}

export function SettingsSheet({ visible, onClose, onLogin, onCheckUpdate, updateStatus, version, stats }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="設定">
      <View style={styles.settings}>
        <SettingsRow iconName="person-circle-outline" label="登入或切換 Threads 帳號" onPress={onLogin} />
        <SettingsRow iconName="cloud-download-outline" label="檢查更新" value={updateStatus} onPress={onCheckUpdate} />
        <SettingsRow iconName="albums-outline" label="收藏" value={stats} />
        <SettingsRow iconName="information-circle-outline" label="版本" value={version} />
        <SettingsRow iconName="text-outline" label="字型" value="霞鶩文楷 TC · SIL OFL 1.1" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  headerButton: { minHeight: TOUCH, minWidth: 64, paddingHorizontal: space.sm, justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingVertical: space.sm },
  form: { gap: space.sm, paddingBottom: space.sm },
  input: { minHeight: TOUCH, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  row: { flexDirection: 'row', marginVertical: space.xs },
  pickerScroll: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.md },
  tile: { ...StyleSheet.absoluteFillObject, borderRadius: radius.sm },
  dim: { opacity: 0.55 },
  ring: { borderWidth: 3 },
  tileBadge: { position: 'absolute', left: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pickerFooter: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  textButton: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.sm },
  pill: {
    position: 'absolute',
    left: space.lg,
    right: 56 + space.lg * 2,
    minHeight: TOUCH,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
  },
  pillMain: { flex: 1, minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: space.md,
  },
  settings: { paddingBottom: space.md },
  settingsRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm, borderRadius: radius.sm },
});
