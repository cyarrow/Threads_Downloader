import { useRef, useState } from 'react';
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
import { progressFraction, progressLabel } from '../../updateInstall';
import { imageSource } from '../media';
import { TOUCH, elevation, icon, radius, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet, useKeyboardOverlap } from './base';
import { QuickSaveSettingRow } from './QuickSave';
import { BackupSettings } from './BackupSettings';
import { ThemeSettingRow } from './theme/ThemeSetting';

const LOGIN_URL = 'https://www.threads.com/login';

// Full-height page for logging in to Threads; closes itself once Threads lands
// on a regular page (meaning the session is logged in).
export function LoginSheet({ visible, onClose, onLoggedIn }) {
  const t = useCollectionTheme();
  const insets = useSafeAreaInsets();
  // The Threads login form is a web page: keep its fields above the keyboard too.
  const rootRef = useRef(null);
  const keyboard = useKeyboardOverlap(rootRef);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View ref={rootRef} collapsable={false} style={[styles.page, { backgroundColor: t.card, paddingBottom: keyboard || insets.bottom }]}>
        <View style={[styles.pageHeader, { borderBottomColor: t.border }]}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.headerButton}>
            <Text style={[t.font.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[t.font.title, { color: t.foreground }]} accessibilityRole="header">
            登入 Threads
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={t.mutedForeground} />
          <Text style={[t.font.meta, { color: t.mutedForeground, flex: 1 }]}>
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
        <Text nativeID="addLinkLabel" style={[t.font.label, { color: t.foreground }]}>貼文連結</Text>
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
          style={[t.font.body, styles.input, { borderRadius: t.radius.md, color: t.foreground, backgroundColor: t.field, borderColor: error ? t.danger : t.field }]}
        />
        {error ? (
          <View style={styles.inline} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
            <Text style={[t.font.meta, { color: t.danger }]}>{error}</Text>
          </View>
        ) : (
          <Text style={[t.font.meta, { color: t.mutedForeground }]}>支援貼文連結與 Threads App 的分享連結</Text>
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
              <Image source={imageSource(m.thumb || m.poster)} style={[styles.tile, { borderRadius: t.radius.sm, backgroundColor: t.muted }]} contentFit="cover" />
              {!on && <View style={[styles.tile, { borderRadius: t.radius.sm }, styles.dim, { backgroundColor: t.background }]} />}
              {on && <View style={[styles.tile, { borderRadius: t.radius.sm }, styles.ring, { borderColor: t.primary }]} />}
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
          <Text style={[t.font.label, { color: t.accent }]}>{all ? '全不選' : '全選'}</Text>
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
        <Text style={[t.font.label, { color: t.background, flexShrink: 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {state.phase === 'error' && (
        <IconButton name="close" label="略過這篇" color={t.background} size={icon.md} onPress={onSkip} />
      )}
    </View>
  );
}

function BannerAction({ label, onPress }) {
  const t = useCollectionTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.textButton}>
      <Text style={[t.font.label, { color: t.accent }]}>{label}</Text>
    </Pressable>
  );
}

// 有新版本 on the wall. `u`: useAppUpdate. The update downloads inside the app
// (progress bar), then Android's installer opens; coming back without updating
// offers 安裝 again and the page that allows installs, and a failure says why,
// with the browser download as a fallback.
export function UpdateBanner({ u }) {
  const t = useCollectionTheme();
  const release = u.update;
  if (!release) return null;
  const { phase } = u.install;
  const muted = { color: t.mutedForeground };
  let title = '有新版本';
  let detail = release.name;
  let action = <BannerAction label="下載並安裝" onPress={u.start} />;
  let extra = null;
  if (phase === 'downloading') {
    const { written, total } = u.install;
    const fraction = progressFraction(written, total);
    title = '下載更新中…';
    detail = progressLabel(written, total);
    action = <ActivityIndicator color={t.mutedForeground} style={styles.bannerSpinner} />;
    extra = (
      <View
        style={[styles.progressTrack, { backgroundColor: t.muted }]}
        accessibilityRole="progressbar"
        accessibilityLabel="下載更新"
        accessibilityValue={fraction == null ? undefined : { min: 0, max: 100, now: Math.round(fraction * 100) }}
      >
        <View style={[styles.progressFill, { backgroundColor: t.foreground, width: `${Math.round((fraction ?? 0.05) * 100)}%` }]} />
      </View>
    );
  } else if (phase === 'ready') {
    title = '下載好了';
    detail = '沒看到安裝畫面，或被擋下了？先允許安裝再按「安裝」';
    action = <BannerAction label="安裝" onPress={u.start} />;
    extra = (
      <View style={styles.bannerActions}>
        <BannerAction label="允許安裝" onPress={u.allowInstalls} />
      </View>
    );
  } else if (phase === 'failed') {
    title = '更新失敗';
    detail = u.install.message;
    action = <BannerAction label="重試" onPress={u.start} />;
    extra = (
      <View style={styles.bannerActions}>
        <BannerAction label="改用瀏覽器下載" onPress={u.openInBrowser} />
      </View>
    );
  }
  return (
    <View style={[styles.bannerBox, { borderRadius: t.radius.md, backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.banner}>
        <Ionicons name={phase === 'failed' ? 'alert-circle' : 'arrow-up-circle'} size={icon.lg} color={phase === 'failed' ? t.danger : t.foreground} />
        <View style={styles.flex} accessibilityLiveRegion="polite">
          <Text style={[t.font.label, { color: t.foreground }]}>{title}</Text>
          <Text style={[t.font.meta, muted]} numberOfLines={2}>
            {detail}
          </Text>
        </View>
        {action}
        {phase !== 'downloading' && <IconButton name="close" label="稍後再說" color={t.mutedForeground} size={icon.md} onPress={u.dismiss} />}
      </View>
      {extra}
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
      style={({ pressed }) => [styles.settingsRow, { borderRadius: t.radius.sm }, pressed && onPress && { backgroundColor: t.muted }]}
    >
      <Ionicons name={iconName} size={icon.lg} color={t.foreground} />
      <Text style={[t.font.body, { color: t.foreground, flex: 1 }]}>{label}</Text>
      {!!value && (
        <Text style={[t.font.meta, { color: t.mutedForeground, flexShrink: 1, maxWidth: '60%', textAlign: 'right' }]}>{value}</Text>
      )}
      {onPress && <Ionicons name="chevron-forward" size={icon.sm} color={t.mutedForeground} />}
    </Pressable>
  );
}

export function SettingsSheet({ visible, onClose, onLogin, onTags, onRules, rulesCount = 0, onExport, onImport, onCheckUpdate, updateStatus, version, stats, readSpeed, quickSave, onQuickSave }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="設定">
      <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.settings}>
        <SettingsRow iconName="pricetags-outline" label="標籤管理" onPress={onTags} />
        {onRules && (
          <SettingsRow iconName="color-wand-outline" label="自動標籤規則" value={rulesCount ? `${rulesCount} 條` : '未設定'} onPress={onRules} />
        )}
        <ThemeSettingRow />
        <QuickSaveSettingRow value={quickSave} onChange={onQuickSave} />
        <BackupSettings />
        <SettingsRow iconName="share-outline" label="匯出備份" value="換手機時用" onPress={onExport} />
        <SettingsRow iconName="download-outline" label="匯入備份" onPress={onImport} />
        <SettingsRow iconName="person-circle-outline" label="登入或切換 Threads 帳號" onPress={onLogin} />
        <SettingsRow iconName="cloud-download-outline" label="檢查更新" value={updateStatus} onPress={onCheckUpdate} />
        <SettingsRow iconName="albums-outline" label="收藏" value={stats} />
        {!!readSpeed && <SettingsRow iconName="speedometer-outline" label="讀取一篇" value={readSpeed} />}
        <SettingsRow iconName="information-circle-outline" label="版本" value={version} />
        <SettingsRow iconName="text-outline" label="字型" value="霞鶩文楷 TC、IBM Plex Mono · SIL OFL 1.1" />
      </ScrollView>
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
  input: { minHeight: TOUCH, borderWidth: 1.5, paddingHorizontal: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  row: { flexDirection: 'row', marginVertical: space.xs },
  pickerScroll: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.md },
  tile: { ...StyleSheet.absoluteFillObject, },
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
  bannerBox: { borderWidth: 1, paddingLeft: space.md, paddingVertical: space.xs },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bannerSpinner: { width: TOUCH, height: TOUCH },
  bannerActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -space.sm },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginRight: space.md, marginBottom: space.md },
  progressFill: { height: 4, borderRadius: 2 },
  settings: { paddingBottom: space.md },
  settingsRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm, },
});
