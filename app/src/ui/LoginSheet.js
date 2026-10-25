import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { isLoggedInUrl } from '../threads';
import { type, useTheme } from './theme';

const LOGIN_URL = 'https://www.threads.com/login';

// Sheet that slides up over the app only when a login is actually needed,
// and slides back down the same way once Threads reports a logged-in page.
export function LoginSheet({ visible, onClose, onLoggedIn }) {
  const t = useTheme();

  // Starts at /login; if Threads already has a session it redirects straight on.
  const onNav = ({ url, loading }) => {
    if (!loading && isLoggedInUrl(url)) onLoggedIn();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: t.card }]}>
        <View style={[styles.header, { borderBottomColor: t.separator }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[type.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[type.headline, { color: t.label }]}>登入 Threads</Text>
          <View style={styles.spacer} />
        </View>
        <Text style={[type.footnote, styles.note, { color: t.secondary }]}>
          登入只會保存在這支手機上，用來讀取你看得到的貼文。
        </Text>
        {visible && (
          <WebView
            source={{ uri: LOGIN_URL }}
            onNavigationStateChange={onNav}
            sharedCookiesEnabled
            style={styles.web}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spacer: { width: 34 },
  note: { paddingHorizontal: 16, paddingVertical: 10 },
  web: { flex: 1 },
});
