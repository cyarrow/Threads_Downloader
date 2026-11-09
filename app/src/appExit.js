import { BackHandler, Platform, ToastAndroid } from 'react-native';

// How long a confirmation stays visible before handing the user back to Threads.
const RETURN_DELAY_MS = 700;

// Toast that survives leaving the app (shown over Threads); Android only.
export function systemToast(message) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
}

// After a share from Threads is done, go back there.
export function leaveToThreads() {
  if (Platform.OS === 'android') setTimeout(() => BackHandler.exitApp(), RETURN_DELAY_MS);
}
