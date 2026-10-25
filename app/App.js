import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useShareIntent } from 'expo-share-intent';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDownloader } from './src/useDownloader';
import { parseThreadsUrl } from './src/threads';
import { Button, Card, StatusCard } from './src/ui/components';
import { LoginSheet } from './src/ui/LoginSheet';
import { type, useTheme } from './src/ui/theme';

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
  const { state, start, retry, webViewProps, webViewKey, busy } = useDownloader();
  const [link, setLink] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const resumeAfterLogin = useRef(false);

  const download = (text) => {
    const post = parseThreadsUrl(text);
    setLink(post ? post.url : text);
    start(text);
  };

  // "Share → Threads 下載" from the Threads app lands here and starts right away.
  useEffect(() => {
    if (!hasShareIntent) return;
    download(shareIntent.webUrl || shareIntent.text || '');
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  // The only way past a login wall is logging in, so offer the sheet right away
  // and pick the download back up once it closes logged in.
  useEffect(() => {
    if (state.action?.kind === 'login') {
      resumeAfterLogin.current = true;
      setLoginOpen(true);
    }
  }, [state]);

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
