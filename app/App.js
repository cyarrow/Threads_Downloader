import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
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
import { useShareIntent } from 'expo-share-intent';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDownloader } from './src/useDownloader';
import { useHistory } from './src/history';
import { summary } from './src/historyModel';
import { parseThreadsUrl } from './src/threads';
import { checkForUpdate } from './src/updates';
import { Button, Card, StatusCard } from './src/ui/components';
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [update, setUpdate] = useState(null);
  const resumeAfterLogin = useRef(false);

  const download = (text, options) => {
    const post = parseThreadsUrl(text);
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

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.largeTitle, { color: t.label }]}>Threads 下載</Text>
        <Text style={[type.subhead, styles.subtitle, { color: t.secondary }]}>
          把貼文裡的影片和圖片存到相簿
        </Text>

        <UpdateCard release={update} onDismiss={() => setUpdate(null)} />

        <Card style={styles.inputCard}>
          <View style={[styles.field, { backgroundColor: t.fill }]}>
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="貼上 Threads 貼文連結"
              placeholderTextColor={t.tertiary}
              style={[type.body, styles.input, { color: t.label }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={() => link && download(link)}
              editable={!busy}
            />
            {!!link && !busy && (
              <Pressable onPress={() => setLink('')} hitSlop={10} accessibilityLabel="清除連結">
                <Text style={[styles.clear, { color: t.tertiary }]}>✕</Text>
              </Pressable>
            )}
          </View>
          <Button
            title={link ? '下載' : '貼上連結並下載'}
            onPress={link ? () => download(link) : pasteAndDownload}
            disabled={busy}
            style={styles.primary}
          />
        </Card>

        <StatusCard state={state} onAction={onAction} />

        <HistoryList
          items={history.items}
          onRedownload={(url) => download(url)}
          onClear={history.clear}
          disabled={busy}
        />

        <Pressable onPress={() => setLoginOpen(true)} hitSlop={8} style={styles.account}>
          <Text style={[type.footnote, { color: t.secondary }]}>
            讀不到貼文嗎？<Text style={{ color: t.accent }}>登入或切換 Threads 帳號</Text>
          </Text>
        </Pressable>
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
  subtitle: { marginTop: -10 },
  inputCard: { gap: 12 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, minHeight: 48, paddingVertical: 12 },
  clear: { fontSize: 15, paddingLeft: 8 },
  primary: { alignSelf: 'stretch' },
  account: { alignSelf: 'center', paddingVertical: 8 },
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
