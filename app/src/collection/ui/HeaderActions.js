import { StyleSheet, Text, View } from 'react-native';
import { font, space, useCollectionTheme } from '../tokens';
import { IconButton } from './base';

// Top-right actions shared by every tab: ＋ 收藏連結 (was the floating button),
// 搜尋, 設定. Icon-only, so each carries its accessible name.
export function HeaderActions({ onAdd, onSearch, searching, onSettings }) {
  return (
    <View style={styles.row}>
      <IconButton name="add" label="收藏連結" onPress={onAdd} />
      <IconButton name={searching ? 'close' : 'search'} label={searching ? '關閉搜尋' : '搜尋'} onPress={onSearch} />
      <IconButton name="settings-outline" label="設定" onPress={onSettings} />
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
      <Text style={[font.display, styles.title, { color: t.foreground }]} numberOfLines={1} accessibilityRole="header">
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
