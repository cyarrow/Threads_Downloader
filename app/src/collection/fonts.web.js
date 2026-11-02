import { useFonts } from 'expo-font';
import { BRAND_FONT, BRAND_FONT_BOLD_WEB, IMPRINT_FONT } from './tokens';

// Web build (tests / previews): register the fonts at runtime. Text renders in
// the fallback font until they're ready, so don't block on the result.
export function useBrandFont() {
  const [loaded] = useFonts({
    [BRAND_FONT]: require('../../assets/fonts/WenKaiTC-Regular.ttf'),
    [BRAND_FONT_BOLD_WEB]: require('../../assets/fonts/WenKaiTC-Bold.ttf'),
    [IMPRINT_FONT]: require('../../assets/fonts/ImprintMono-Regular.ttf'),
  });
  return loaded;
}
