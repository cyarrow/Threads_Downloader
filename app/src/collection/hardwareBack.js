import { BackHandler } from 'react-native';

// Android back button. `handler` returns true when it handled the press.
// Returns the unsubscribe function. (Web build: see hardwareBack.web.js.)
export function onHardwareBack(handler) {
  const sub = BackHandler.addEventListener('hardwareBackPress', handler);
  return () => sub.remove();
}
