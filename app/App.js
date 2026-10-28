import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useShareIntent } from 'expo-share-intent';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDownloader } from './src/useDownloader';
import { useHistory } from './src/history';
import { summary } from './src/historyModel';
import { parseThreadsUrl } from './src/threads';
import { checkForUpdate } from './src/updates';
import { Button, Card, IconButton, Onboarding, StatusCard } from './src/ui/components';
import { HistoryList } from './src/ui/HistoryList';
import { LoginSheet } from './src/ui/LoginSheet';
import { PickerSheet } from './src/ui/PickerSheet';
import { UpdateCard } from './src/ui/UpdateCard';
import { type, useTheme } from './src/ui/theme';

// How long the success state stays visible before handing the user back to Threads.
const RETURN_DELAY_MS = 700;

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const history = useHistory();
  const { state, start, retry, choose, cancelChoice, webViewProps, webViewKey, busy } =
    useDownloader({ onSaved: history.add });
  const [link, setLink] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [update, setUpdate] = useState(null);
  const resumeAfterLogin = useRef(false);

  // Typed or pasted links are checked right here so the error sits under the field;
  // shared links go straight to the downloader, which reports problems in the card.
  const download = (text, options) => {
    const post = parseThreadsUrl(text);
    if (!post && !options?.fromShare) {
      setFieldError(text.trim() ? '這不是 Threads 貼文連結' : '剪貼簿裡沒有 Threads 連結');
      return;
    }
    setFieldError(null);
    setLink(post ? post.url : text);
    start(text, options);
  };

  // "Share → Threads 下載" from the Threads app lands here and starts right away.
  useEffect(() => {
    if (!hasShareIntent) return;
    download(shareIntent.webUrl || shareIntent.text || '', { fromShare: true });
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  // After a share-started download succeeds, confirm with a toast and step out of
  // the way so the user lands back in Threads. Errors keep the app open.
  useEffect(() => {
    if (state.phase !== 'done' || !state.fromShare || Platform.OS !== 'android') return;
    ToastAndroid.show(`已存到相簿：${summary(state)}`, ToastAndroid.SHORT);
    const timer = setTimeout(() => BackHandler.exitApp(), RETURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // The only way past a login wall is logging in, so offer the sheet right away
  // and pick the download back up once it closes logged in.
  useEffect(() => {
    if (state.action?.kind === 'login') {
      resumeAfterLogin.current = true;
      setLoginOpen(true);
    }
  }, [state]);

  useEffect(() => {
    const { buildNumber, releasesRepo } = Constants.expoConfig?.extra ?? {};
    if (releasesRepo && buildNumber) checkForUpdate(releasesRepo, buildNumber).then(setUpdate);
  }, []);

  const onAction = (kind) => (kind === 'login' ? setLoginOpen(true) : retry());

  const onLoggedIn = () => {
    setLoginOpen(false);
    if (resumeAfterLogin.current) {
      resumeAfterLogin.current = false;
      retry();
    }
  };

  const pasteAndDownload = async () => download(await Clipboard.getStringAsync());

  const firstRun = state.phase === 'idle' && history.items.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[type.largeTitle, { color: t.label }]} accessibilityRole="header">
              Threads 下載
            </Text>
            <Text style={[type.subhead, { color: t.secondary }]}>把貼文裡的影片和圖片存到相簿</Text>
          </View>
          <IconButton
            icon="person-circle-outline"
            size={28}
            label="登入或切換 Threads 帳號"
            onPress={() => setLoginOpen(true)}
          />
        </View>

        <UpdateCard release={update} onDismiss={() => setUpdate(null)} />

        <Card style={styles.inputCard}>
          <Text nativeID="linkLabel" style={[type.footnote, styles.label, { color: t.secondary }]}>
            貼文連結
          </Text>
          <View
            style={[
              styles.field,
              { backgroundColor: t.fill },
              fieldError && { borderColor: t.danger, borderWidth: 1.5 },
            ]}
          >
            <Ionicons name="link-outline" size={20} color={t.secondary} style={styles.fieldIcon} />
            <TextInput
              value={link}
              onChangeText={(v) => {
                setLink(v);
                if (fieldError) setFieldError(null);
              }}
              placeholder="https://www.threads.com/…"
              placeholderTextColor={t.secondary}
              style={[type.body, styles.input, { color: t.label }]}
              accessibilityLabel="貼文連結"
              accessibilityLabelledBy="linkLabel"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={() => download(link)}
              editable={!busy}
            />
            {!!link && !busy && (
              <IconButton
                icon="close-circle"
                size={20}
                color={t.secondary}
                label="清除連結"
                onPress={() => {
                  setLink('');
                  setFieldError(null);
                }}
              />
            )}
          </View>
          {fieldError ? (
            <View style={styles.helper} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={16} color={t.danger} />
              <Text style={[type.footnote, { color: t.danger }]}>{fieldError}</Text>
            </View>
          ) : (
            <Text style={[type.footnote, styles.helperText, { color: t.secondary }]}>
              支援貼文連結與 Threads App 的分享連結
            </Text>
          )}
          <Button
            title={link ? '下載' : '貼上連結並下載'}
            icon={link ? 'download-outline' : 'clipboard-outline'}
            onPress={link ? () => download(link) : pasteAndDownload}
            disabled={busy}
          />
        </Card>

        {firstRun ? <Onboarding /> : <StatusCard state={state} onAction={onAction} />}

        <HistoryList
          items={history.items}
          onRedownload={(url) => download(url)}
          onClear={history.clear}
          disabled={busy}
        />
      </ScrollView>

      {/* Loads the post with the user's Threads session; never shown on screen. */}
      {webViewProps && (
        <WebView key={webViewKey} {...webViewProps} sharedCookiesEnabled style={styles.hiddenWeb} />
      )}

      <PickerSheet
        key={state.phase === 'choosing' ? state.post.code : 'none'}
        post={state.phase === 'choosing' ? state.post : null}
        onConfirm={choose}
        onCancel={cancelChoice}
      />

      <LoginSheet
        visible={loginOpen}
        onClose={() => {
          resumeAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onLoggedIn={onLoggedIn}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1, gap: 2 },
  inputCard: { gap: 8 },
  label: { fontWeight: '600' },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingLeft: 12, minHeight: 50 },
  fieldIcon: { marginRight: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12 },
  helper: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  helperText: { minHeight: 18 },
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
