import { StyleSheet, Text, View } from 'react-native';
import { space, useCollectionTheme } from '../tokens';
import { IconButton } from './base';

// Top-right actions shared by every tab: ＋ 收藏連結 (was the floating button),
// 搜尋, 設定. Icon-only, so each carries its accessible name.
// On the card walls (收藏, a tag page, an author page) `onSelect` adds 選取多篇
// first; an author page leaves out ＋ and 設定 (no `onAdd` / `onSettings`) so
// its @handle title keeps room.
export function HeaderActions({ onAdd, onSearch, searching, onSettings, onSelect }) {
  return (
    <View style={styles.row}>
      {onSelect && <IconButton name="checkmark-circle-outline" label="選取多篇" onPress={onSelect} />}
      {onAdd && <IconButton name="add" label="收藏連結" onPress={onAdd} />}
      <IconButton name={searching ? 'close' : 'search'} label={searching ? '關閉搜尋' : '搜尋'} onPress={onSearch} />
      {onSettings && <IconButton name="settings-outline" label="設定" onPress={onSettings} />}
    </View>
  );
}

// Plain screen header for 翻翻 / 串流 / 所有標籤: WenKai title on the left (with
// an optional back arrow), actions on the right. `right` replaces the actions.
export function ScreenHeader({ title, onBack, backLabel = '返回', right, actions }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.header}>
      {onBack && <IconButton name="chevron-back" label={backLabel} onPress={onBack} />}
      <Text style={[t.font.display, styles.title, { color: t.foreground }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
      {actions && <HeaderActions {...actions} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, marginRight: -space.sm },
  title: { flex: 1, minWidth: 0 },
});
