import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tagNameError } from '../collectionModel';
import { reasonText } from '../suggest';
import { cardStill } from '../media';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, font, icon, radius, space, useCollectionTheme } from '../tokens';
import { PrimaryButton, Sheet, TagChip } from './base';

function NewTagForm({ index, parentId: initialParent, onCreate, onCancel }) {
  const t = useCollectionTheme();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(initialParent || null);
  const [error, setError] = useState(null);

  const submit = () => {
    const problem = tagNameError(name, parentId, Object.values(index.byId));
    if (problem) return setError(problem);
    onCreate(name.trim(), parentId);
  };

  return (
    <View style={[styles.form, { backgroundColor: t.muted, borderColor: t.border }]}>
      <Text nativeID="newTagLabel" style={[font.label, { color: t.foreground }]}>新標籤名稱</Text>
      <TextInput
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        onSubmitEditing={submit}
        autoFocus
        placeholder="例如：某個團體、咖啡廳"
        placeholderTextColor={t.mutedForeground}
        accessibilityLabel="新標籤名稱"
        accessibilityLabelledBy="newTagLabel"
        style={[font.body, styles.input, { color: t.foreground, backgroundColor: t.card, borderColor: error ? t.danger : t.border }]}
      />
      {error && (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
          <Text style={[font.meta, { color: t.danger }]}>{error}</Text>
        </View>
      )}
      <Text style={[font.label, { color: t.foreground }]}>放在</Text>
      <View style={styles.chips}>
        <TagChip neutral label="新的大標籤" selected={parentId === null} onPress={() => setParentId(null)} />
        {index.parents.map((p) => (
          <TagChip key={p.id} hue={p.color} label={`${p.name} 底下`} selected={parentId === p.id} onPress={() => setParentId(p.id)} />
        ))}
      </View>
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} accessibilityRole="button" style={styles.textButton}>
          <Text style={[font.label, { color: t.accent }]}>取消</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          style={[styles.addButton, { backgroundColor: t.foreground }]}
        >
          <Text style={[font.label, { color: t.background }]}>新增</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Multi-select picker for two-level tags. Tapping a parent that has children
// expands it; its row starts with "整個「X」" to tag the parent itself.
export function TagPicker({ index, selected, onToggle, onCreate, recentIds = [], suggestions = [] }) {
  const t = useCollectionTheme();
  const [open, setOpen] = useState(() =>
    index.parents.filter((p) => (index.children[p.id] || []).some((c) => selected.includes(c.id))).map((p) => p.id),
  );
  const [creating, setCreating] = useState(null); // { parentId } while the form is open

  const suggestedIds = suggestions.map((sg) => sg.tag.id);
  const recent = recentIds.map((id) => index.byId[id]).filter((tg) => tg && !suggestedIds.includes(tg.id));
  // A parent only looks selected when the parent itself is tagged; picked
  // children show as a count so it's clear the parent isn't tagged too.
  const pickedChildren = (p) => (index.children[p.id] || []).filter((c) => selected.includes(c.id)).length;

  const create = async (name, parentId) => {
    const tag = await onCreate(name, parentId);
    setCreating(null);
    if (parentId && !open.includes(parentId)) setOpen([...open, parentId]);
    if (tag) onToggle(tag.id);
  };

  return (
    <View style={styles.picker}>
      {suggestions.length > 0 && (
        <View style={styles.group}>
          <Text style={[font.meta, { color: t.mutedForeground }]}>建議</Text>
          {suggestions.map(({ tag, reasons }) => (
            <View key={tag.id} style={styles.suggestion}>
              <TagChip
                hue={tagHue(tag, index.byId)}
                label={tagLabel(tag, index.byId)}
                selected={selected.includes(tag.id)}
                onPress={() => onToggle(tag.id)}
                a11yLabel={`${tagLabel(tag, index.byId)}，${reasonText(reasons)}`}
              />
              <Text style={[font.meta, styles.reason, { color: t.mutedForeground }]} numberOfLines={2}>
                {reasonText(reasons)}
              </Text>
            </View>
          ))}
        </View>
      )}
      {recent.length > 0 && (
        <View style={styles.group}>
          <Text style={[font.meta, { color: t.mutedForeground }]}>最近用過</Text>
          <View style={styles.chips}>
            {recent.map((tag) => (
              <TagChip
                key={tag.id}
                hue={tagHue(tag, index.byId)}
                label={tagLabel(tag, index.byId)}
                selected={selected.includes(tag.id)}
                onPress={() => onToggle(tag.id)}
              />
            ))}
          </View>
        </View>
      )}
      <View style={styles.group}>
        <Text style={[font.meta, { color: t.mutedForeground }]}>全部標籤</Text>
        <View style={styles.chips}>
          {index.parents.map((p) => {
            const kids = index.children[p.id] || [];
            if (!kids.length) {
              return (
                <TagChip key={p.id} hue={p.color} label={p.name} selected={selected.includes(p.id)} onPress={() => onToggle(p.id)} />
              );
            }
            const isOpen = open.includes(p.id);
            const picked = pickedChildren(p);
            return (
              <TagChip
                key={p.id}
                hue={p.color}
                label={picked ? `${p.name} · ${picked}` : p.name}
                selected={selected.includes(p.id)}
                expanded={isOpen}
                trailingIcon={isOpen ? 'chevron-up' : 'chevron-down'}
                a11yLabel={`${p.name}，${kids.length} 個小標籤${picked ? `，已選 ${picked} 個` : ''}`}
                onPress={() => setOpen(isOpen ? open.filter((id) => id !== p.id) : [...open, p.id])}
              />
            );
          })}
          <TagChip neutral iconName="add" label="新增標籤" expanded={false} onPress={() => setCreating({ parentId: null })} />
        </View>
        {index.parents
          .filter((p) => open.includes(p.id))
          .map((p) => (
            <View key={p.id} style={[styles.chips, styles.childRow, { borderLeftColor: t.border }]}>
              <TagChip hue={p.color} label={`整個「${p.name}」`} selected={selected.includes(p.id)} onPress={() => onToggle(p.id)} />
              {(index.children[p.id] || []).map((c) => (
                <TagChip key={c.id} hue={p.color} label={c.name} selected={selected.includes(c.id)} onPress={() => onToggle(c.id)} />
              ))}
              <TagChip
                neutral
                iconName="add"
                label="新增小標籤"
                expanded={false}
                onPress={() => setCreating({ parentId: p.id })}
              />
            </View>
          ))}
      </View>
      {creating && (
        <NewTagForm
          key={creating.parentId || 'root'}
          index={index}
          parentId={creating.parentId}
          onCreate={create}
          onCancel={() => setCreating(null)}
        />
      )}
    </View>
  );
}

function Preview({ post, loading }) {
  const t = useCollectionTheme();
  const first = post && cardStill(post);
  return (
    <View style={[styles.preview, { backgroundColor: t.muted }]} accessibilityLiveRegion="polite">
      {loading ? (
        <View style={[styles.thumb, { backgroundColor: t.field }]} />
      ) : first ? (
        <Image source={first} style={styles.thumb} contentFit="cover" accessible={false} />
      ) : (
        <View style={[styles.thumb, styles.thumbQuote, { backgroundColor: t.field }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={icon.lg} color={t.mutedForeground} />
        </View>
      )}
      <View style={styles.previewText}>
        <Text style={[font.label, { color: t.foreground }]} numberOfLines={1}>
          {loading ? '讀取中…' : post.author ? `@${post.author}` : 'Threads 貼文'}
        </Text>
        {loading ? (
          <View style={[styles.skeletonLine, { backgroundColor: t.field }]} />
        ) : (
          <Text style={[font.meta, { color: t.mutedForeground }]} numberOfLines={2}>
            {post.caption}
          </Text>
        )}
      </View>
    </View>
  );
}

// Appears right after a link is saved (from Threads' share menu or the + button).
// The post is already stored in 未分類, so closing never loses anything.
export function SaveSheet({ visible, mode, post, loading, index, selected, onToggle, onCreateTag, recentIds, suggestions, downloadToo, onDownloadToo, onDone, onClose }) {
  const t = useCollectionTheme();
  const isNew = mode === 'new';
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isNew ? '已收藏' : '編輯標籤'}
      footer={
        <View style={styles.footer}>
          {isNew && (
            <Pressable
              onPress={() => onDownloadToo(!downloadToo)}
              accessibilityRole="switch"
              accessibilityState={{ checked: downloadToo }}
              style={styles.switchRow}
            >
              <Ionicons name="download-outline" size={icon.md} color={t.foreground} />
              <Text style={[font.body, { color: t.foreground, flex: 1 }]}>同時下載到相簿</Text>
              <Switch
                value={downloadToo}
                onValueChange={onDownloadToo}
                // Off track uses mutedForeground so the control stays ≥3:1 against the sheet.
                trackColor={{ true: t.primary, false: t.mutedForeground }}
                thumbColor="#FFFFFF"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          )}
          <PrimaryButton title="完成" onPress={onDone} />
        </View>
      }
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isNew && <Preview post={post} loading={loading} />}
        <Text style={[font.headline, { color: t.foreground }]}>{isNew ? '加上標籤' : '標籤'}</Text>
        {visible && (
          <TagPicker
            index={index}
            selected={selected}
            onToggle={onToggle}
            onCreate={onCreateTag}
            recentIds={recentIds}
            suggestions={suggestions}
          />
        )}
        {isNew && selected.length === 0 && (
          <Text style={[font.meta, { color: t.mutedForeground }]}>不選也可以，會先放在「未分類」。</Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { gap: space.md, paddingBottom: space.md },
  picker: { gap: space.lg },
  group: { gap: space.sm },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reason: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  childRow: { borderLeftWidth: 2, paddingLeft: space.sm, marginLeft: space.xs, marginTop: space.xs },
  preview: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbQuote: { alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1, gap: 2 },
  skeletonLine: { height: 12, borderRadius: 6, width: '80%', marginTop: 4 },
  form: { gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  input: { minHeight: TOUCH, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.xs },
  textButton: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md },
  addButton: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.xl, borderRadius: radius.md },
  footer: { gap: space.md, paddingTop: space.sm },
  switchRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.md },
});
