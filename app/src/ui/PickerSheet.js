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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './components';
import { type, useTheme } from './theme';

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
          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button">
            <Text style={[type.body, { color: t.accent }]}>取消</Text>
          </Pressable>
          <Text style={[type.headline, { color: t.label }]}>
            已選 {selected.length} / {post.media.length}
          </Text>
          <Pressable
            onPress={() => setSelected(all ? [] : post.media.map((_, i) => i))}
            hitSlop={12}
            accessibilityRole="button"
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
                accessibilityLabel={`第 ${index + 1} 項${item.type === 'video' ? '影片' : '圖片'}`}
              >
                {({ pressed }) => (
                  <View style={{ width: size, height: size, opacity: pressed ? 0.8 : 1 }}>
                    {item.thumb ? (
                      <Image source={{ uri: item.thumb }} style={[styles.thumb, { backgroundColor: t.fill }]} />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: t.fill }]} />
                    )}
                    {!on && <View style={[styles.dim, { backgroundColor: t.background }]} />}
                    {item.type === 'video' && (
                      <View style={styles.videoBadge}>
                        <Text style={styles.videoGlyph}>▶</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.check,
                        on ? { backgroundColor: t.accent, borderColor: '#fff' } : { borderColor: '#fff' },
                      ]}
                    >
                      {on && <Text style={styles.checkGlyph}>✓</Text>}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grid: { padding: PADDING },
  thumb: { width: '100%', height: '100%', borderRadius: 6 },
  dim: { ...StyleSheet.absoluteFillObject, borderRadius: 6, opacity: 0.5 },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoGlyph: { color: '#fff', fontSize: 11 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  checkGlyph: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
