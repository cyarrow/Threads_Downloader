// 個人筆記: the user's own words about a post (「為什麼收藏」). They are always set
// apart from the post's text (the author's words, in WenKai): sans type behind a
// pencil, under a 「我的筆記」 label or a 2px ink bar — or, on a 底片 print, written
// by hand on the photo's edge (Print `note`, PhotoBack `note`).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTE_MAX, normalizeNote } from '../noteModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { PrimaryButton, SecondaryButton, Sheet } from './base';

const BAR = 2;

// 雜誌 wall card: one line in the meta area — pencil + the note's first line.
export function NoteLine({ text }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.line}>
      <Ionicons name="pencil" size={12} color={t.mutedForeground} style={styles.lineIcon} />
      <Text style={[t.font.meta, styles.flex, { color: t.foreground }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// The whole note, behind an ink bar with a small 「我的筆記」 label (串流, detail).
export function NoteBlock({ text, selectable }) {
  const t = useCollectionTheme();
  return (
    <View style={[styles.block, { borderLeftColor: t.foreground }]} accessibilityLabel={`我的筆記：${text}`} accessible>
      <View style={styles.label}>
        <Ionicons name="pencil" size={12} color={t.mutedForeground} />
        <Text style={[t.font.kicker, { color: t.mutedForeground }]}>我的筆記</Text>
      </View>
      <Text style={[t.font.body, { color: t.foreground }]} selectable={selectable}>
        {text}
      </Text>
    </View>
  );
}

// Detail page section 「筆記」: the note (tap to edit) or a prompt to write one.
export function NoteSection({ note, onEdit, ruleStyle }) {
  const t = useCollectionTheme();
  return (
    <View style={[styles.section, ruleStyle]}>
      <View style={styles.header}>
        <Text style={[t.font.kicker, { color: t.mutedForeground }]}>筆記</Text>
        {!!note && (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="編輯筆記" style={styles.link}>
            <Text style={[t.font.label, { color: t.accent }]}>編輯</Text>
            <Ionicons name="chevron-forward" size={icon.sm} color={t.accent} />
          </Pressable>
        )}
      </View>
      {note ? (
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`我的筆記：${note}`} accessibilityHint="點兩下編輯">
          {({ pressed }) => (
            <View style={[styles.block, { borderLeftColor: t.foreground, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[t.font.body, { color: t.foreground }]}>{note}</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          style={({ pressed }) => [styles.add, { borderColor: t.outline, borderRadius: t.radius.sm }, pressed && { backgroundColor: t.muted }]}
        >
          <Ionicons name="pencil-outline" size={icon.md} color={t.foreground} />
          <Text style={[t.font.label, styles.flex, { color: t.foreground }]}>寫一句為什麼收藏</Text>
        </Pressable>
      )}
    </View>
  );
}

// Small sheet for writing the note. Closing it keeps what was typed (like the save
// sheet, closing never loses anything); 清除 empties the box. `onDone(text)`.
export function NoteSheet({ note, onDone }) {
  const t = useCollectionTheme();
  const [text, setText] = useState(note || '');
  const count = [...text.trim()].length;
  const finish = () => onDone(normalizeNote(text));
  return (
    <Sheet
      visible
      onClose={finish}
      title="筆記"
      footer={
        <View style={styles.footer}>
          {!!text && (
            <View style={styles.clear}>
              <SecondaryButton title="清除" iconName="close-circle-outline" onPress={() => setText('')} />
            </View>
          )}
          <View style={styles.flex}>
            <PrimaryButton title="完成" onPress={finish} />
          </View>
        </View>
      }
    >
      <View style={styles.form}>
        <Text style={[t.font.meta, { color: t.mutedForeground }]}>
          只有你看得到，寫下為什麼收藏這篇。
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          maxLength={NOTE_MAX}
          textAlignVertical="top"
          placeholder="例如：想帶媽媽去、下次剪頭髮給設計師看"
          placeholderTextColor={t.mutedForeground}
          accessibilityLabel="筆記"
          accessibilityHint="只有你看得到"
          style={[t.font.body, styles.input, { borderRadius: t.radius.sm, color: t.foreground, backgroundColor: t.card, borderColor: t.outline }]}
        />
        <Text style={[t.font.caption, styles.count, { color: t.mutedForeground }]} accessibilityLiveRegion="polite">
          {count} / {NOTE_MAX}
        </Text>
      </View>
    </Sheet>
  );
}

// Save sheet: one compact line under the tags (not in the quick panel).
export function NoteField({ value, onChange }) {
  const t = useCollectionTheme();
  return (
    <View style={[styles.field, { borderRadius: t.radius.sm, borderColor: t.outline }]}>
      <Ionicons name="pencil-outline" size={icon.md} color={t.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={NOTE_MAX}
        returnKeyType="done"
        blurOnSubmit
        placeholder="加一句筆記…"
        placeholderTextColor={t.mutedForeground}
        accessibilityLabel="筆記"
        accessibilityHint="寫下為什麼收藏，只有你看得到"
        style={[t.font.body, styles.fieldInput, { color: t.foreground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineIcon: { marginTop: 1 },
  block: { borderLeftWidth: BAR, paddingLeft: space.md, gap: 2 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { borderTopWidth: StyleSheet.hairlineWidth * 2, marginTop: space.sm, gap: space.xs, paddingBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -space.sm },
  link: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: space.sm },
  add: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: space.md },
  form: { gap: space.sm, paddingBottom: space.sm },
  input: { minHeight: 120, maxHeight: 220, borderWidth: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
  count: { alignSelf: 'flex-end', fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm, alignItems: 'center' },
  clear: { width: 120, flexDirection: 'row' },
  field: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, paddingLeft: space.md },
  fieldInput: { flex: 1, minHeight: TOUCH, paddingRight: space.md },
});
