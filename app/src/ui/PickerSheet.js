import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './components';
import { TOUCH, type, useTheme } from './theme';

const COLUMNS = 3;
const GAP = 4;
const PADDING = 16;

// Lets the user choose which items of a multi-photo/video post to save.
// Everything starts selected, so "download all" stays a single tap.
export function PickerSheet({ post, onConfirm, onCancel }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Remounted per post (keyed by the caller), so this starts fresh each time.
  const [selected, setSelected] = useState(() => (post ? post.media.map((_, i) => i) : []));

  if (!post) return null;

  const size = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const all = selected.length === post.media.length;
  const toggle = (i) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[styles.sheet, { backgroundColor: t.background }]}>
        <View style={[styles.header, { borderBottomColor: t.separator, backgroundColor: t.card }]}>
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.headerButton}>
            <Text style={[type.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[type.headline, { color: t.label }]} accessibilityLiveRegion="polite">
            已選 {selected.length} / {post.media.length}
          </Text>
          <Pressable
            onPress={() => setSelected(all ? [] : post.media.map((_, i) => i))}
            accessibilityRole="button"
            style={[styles.headerButton, styles.headerButtonEnd]}
          >
            <Text style={[type.body, { color: t.accent }]}>{all ? '全不選' : '全選'}</Text>
          </Pressable>
        </View>

        <FlatList
          data={post.media}
          keyExtractor={(_, i) => String(i)}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item, index }) => {
            const on = selected.includes(index);
            return (
              <Pressable
                onPress={() => toggle(index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`第 ${index + 1} 項，${item.type === 'video' ? '影片' : '圖片'}`}
              >
                {({ pressed }) => (
                  <View style={{ width: size, height: size, opacity: pressed ? 0.8 : 1 }}>
                    {item.thumb ? (
                      <Image source={{ uri: item.thumb }} style={[styles.thumb, { backgroundColor: t.fill }]} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: t.fill }]}>
                        <Ionicons name="images-outline" size={28} color={t.tertiary} />
                      </View>
                    )}
                    {!on && <View style={[styles.dim, { backgroundColor: t.background }]} />}
                    {on && <View style={[styles.ring, { borderColor: t.accentFill }]} />}
                    {item.type === 'video' && (
                      <View style={[styles.videoBadge, { backgroundColor: t.scrim }]}>
                        <Ionicons name="play" size={12} color={t.onFill} />
                      </View>
                    )}
                    <View
                      style={[
                        styles.check,
                        { borderColor: t.onFill },
                        on ? { backgroundColor: t.accentFill } : { backgroundColor: t.scrim },
                      ]}
                    >
                      {on && <Ionicons name="checkmark" size={16} color={t.onAccent} />}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 12, backgroundColor: t.card, borderTopColor: t.separator },
          ]}
        >
          <Button
            title={selected.length ? `下載 ${selected.length} 項` : '請至少選擇一項'}
            icon={selected.length ? 'download-outline' : undefined}
            disabled={!selected.length}
            onPress={() => onConfirm(selected)}
          />
        </View>
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
  headerButton: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 8, justifyContent: 'center' },
  headerButtonEnd: { alignItems: 'flex-end' },
  grid: { padding: PADDING },
  thumb: { width: '100%', height: '100%', borderRadius: 6 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  dim: { ...StyleSheet.absoluteFillObject, borderRadius: 6, opacity: 0.55 },
  ring: { ...StyleSheet.absoluteFillObject, borderRadius: 6, borderWidth: 3 },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
