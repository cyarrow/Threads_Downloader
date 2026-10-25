import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';
import { extractMedia, parseThreadsUrl } from './src/threads';
import { collectScript } from './src/injected';
import { saveAll } from './src/download';

const LOGIN_URL = 'https://www.threads.com/login';

// UI intentionally bare-bones: paste/copy a link -> media lands in the photo library.
export default function App() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('複製 Threads 貼文連結後回到 App，會自動下載');
  const [webUrl, setWebUrl] = useState(null);
  const target = useRef(null); // { code, url } while extracting, null otherwise
  const lastCode = useRef(null);
  const webRef = useRef(null);

  const start = useCallback((text) => {
    const post = parseThreadsUrl(text);
    if (!post) {
      setStatus('不是有效的 Threads 貼文連結');
      return;
    }
    lastCode.current = post.code;
    target.current = post;
    setInput(post.url);
    setStatus('讀取貼文中…');
    setWebUrl(`${post.url}?t=${Date.now()}`); // force reload even for the same post
  }, []);

  // One-tap flow: whenever the app comes to the foreground, pick up a copied link.
  useEffect(() => {
    const check = async () => {
      const text = await Clipboard.getStringAsync();
      const post = parseThreadsUrl(text);
      if (post && post.code !== lastCode.current) start(text);
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [start]);

  const onLoadEnd = () => {
    if (target.current) webRef.current?.injectJavaScript(collectScript(target.current.code));
  };

  const onMessage = async (event) => {
    const post = target.current;
    const data = JSON.parse(event.nativeEvent.data);
    if (!post || data.code !== post.code) return;
    target.current = null;

    const media = extractMedia(data.json, post.code, data.videos);
    if (!media.length) {
      setStatus(
        data.loggedOut || !data.json.length
          ? '讀不到貼文內容，請先按「登入 Threads」後再下載一次'
          : '這篇貼文沒有圖片或影片',
      );
      return;
    }
    try {
      const n = await saveAll(post.code, media, (i, total) =>
        setStatus(`下載中 ${i + 1}/${total}…`),
      );
      setStatus(`完成！已儲存 ${n} 個檔案到相簿`);
    } catch (e) {
      setStatus(`下載失敗：${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="貼上 Threads 貼文連結"
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <Button title="下載" onPress={() => start(input)} />
        <Button
          title="登入 Threads"
          onPress={() => {
            target.current = null;
            setStatus('登入完成後，回到上方按「下載」');
            setWebUrl(LOGIN_URL);
          }}
        />
      </View>
      <Text style={styles.status}>{status}</Text>
      {webUrl && (
        <WebView
          ref={webRef}
          style={styles.web}
          source={{ uri: webUrl }}
          onLoadEnd={onLoadEnd}
          onMessage={onMessage}
          sharedCookiesEnabled
          allowsInlineMediaPlayback
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 },
  status: { marginBottom: 12 },
  web: { flex: 1 },
});
