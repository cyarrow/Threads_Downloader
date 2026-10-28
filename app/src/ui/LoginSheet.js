import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { isLoggedInUrl } from '../threads';
import { TOUCH, type, useTheme } from './theme';

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
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.headerButton}>
            <Text style={[type.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[type.headline, { color: t.label }]} accessibilityRole="header">
            登入 Threads
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={t.secondary} />
          <Text style={[type.footnote, styles.noteText, { color: t.secondary }]}>
            登入只會保存在這支手機上，用來讀取你看得到的貼文。
          </Text>
        </View>
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
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: { minHeight: TOUCH, minWidth: 64, paddingHorizontal: 8, justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  noteText: { flex: 1 },
  web: { flex: 1 },
});
