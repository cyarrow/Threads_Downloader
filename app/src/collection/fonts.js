// Native builds embed the brand font at build time (expo-font plugin in app.json),
// so there is nothing to load at runtime.
export function useBrandFont() {
  return true;
}
