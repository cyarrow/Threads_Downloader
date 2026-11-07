// Save sheet row for 自動標籤規則 (the rule screens are in TagRules.js).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ruleReason } from '../tagRules';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { TagChip } from './base';

// Save sheet row (new saves only, when the user has rules): the tags the rules
// added, ticked, each with its reason (「規則：@starlight.daily」); untick to drop one.
// Always one row tall from the moment the sheet opens — while the post loads it
// says the rules will be checked — so nothing below it moves when the result comes in.
export function RuleHitsRow({ status, hits, index, selected, onToggle }) {
  const t = useCollectionTheme();
  const known = (hits || []).filter((h) => index.byId[h.tagId]);
  const quiet = (text) => (
    <Text style={[t.font.meta, styles.flex, { color: t.mutedForeground }]} numberOfLines={1}>
      {text}
    </Text>
  );
  return (
    <View style={styles.hits} accessibilityLiveRegion="polite">
      <Ionicons name="color-wand-outline" size={icon.md} color={known.length ? t.foreground : t.mutedForeground} accessibilityLabel="自動標籤規則" />
      {status === 'loading' && quiet('讀取完會套用自動標籤規則…')}
      {status === 'failed' && quiet('貼文讀取成功後才會套用規則')}
      {status === 'ready' && !known.length && quiet('沒有符合的自動標籤規則')}
      {status === 'ready' && known.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hitList} keyboardShouldPersistTaps="handled">
          {known.map(({ tagId, rule }) => {
            const tag = index.byId[tagId];
            const label = tagLabel(tag, index.byId);
            return (
              <View key={tagId} style={styles.hit}>
                <TagChip
                  steady
                  hue={tagHue(tag, index.byId)}
                  label={label}
                  selected={selected.includes(tagId)}
                  onPress={() => onToggle(tagId)}
                  a11yLabel={`${label}，${ruleReason(rule)}`}
                />
                <Text style={[t.font.meta, { color: t.mutedForeground }]} numberOfLines={1}>
                  {ruleReason(rule)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hits: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hitList: { alignItems: 'center', gap: space.md, paddingRight: space.sm },
  hit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
