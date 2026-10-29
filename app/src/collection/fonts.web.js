import { useFonts } from 'expo-font';
import { BRAND_FONT } from './tokens';

// Web build (tests / previews): register the font at runtime. Text renders in
// the fallback font until it's ready, so don't block on the result.
export function useBrandFont() {
  const [loaded] = useFonts({ [BRAND_FONT]: require('../../assets/fonts/WenKaiTC-Regular.ttf') });
  return loaded;
}
