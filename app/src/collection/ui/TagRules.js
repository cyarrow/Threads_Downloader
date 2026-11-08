// 自動標籤規則 screens: the list in 設定, the add/edit sheet (also opened from a
// post's ⋮ menu, 「為 @author 建立規則」), and the row in the save sheet that shows
// which tags the rules picked and why. Rules live in store.js; matching is in
// tagRules.js.
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCollection } from '../store';
import { normalizeRuleValue, postsToTag, ruleError, ruleMatches, ruleText } from '../tagRules';
import { tagHue, tagLabel } from '../tagModel';
import { TOUCH, icon, space, useCollectionTheme } from '../tokens';
import { IconButton, PrimaryButton, SecondaryButton, Sheet } from './base';
import { Toast } from './Overlays';
import { Page } from './Phase2';
import { TagPicker, scrollToEndForKeyboard } from './SaveSheet';
import { TagMark } from './theme';

const RULE = StyleSheet.hairlineWidth * 2;
const KINDS = [
  { id: 'author', name: '作者', iconName: 'person-outline' },
  { id: 'keyword', name: '內文關鍵字', iconName: 'text-outline' },
];

// Segmented control like 設定 › 主題: ink fill + ✓ on the chosen side.
function KindSwitch({ value, onChange }) {
  const t = useCollectionTheme();
  return (
    <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel="條件">
      {KINDS.map((k, i) => {
        const on = k.id === value;
        const r = t.radius.sm;
        const corners = i === 0 ? { borderTopLeftRadius: r, borderBottomLeftRadius: r } : { borderTopRightRadius: r, borderBottomRightRadius: r };
        return (
          <Pressable
            key={k.id}
            onPress={() => onChange(k.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`條件：${k.name}`}
            style={[styles.segmentTarget, i > 0 && styles.joined]}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.segment,
                  corners,
                  { borderColor: t.outline },
                  on && { backgroundColor: t.foreground, borderColor: t.foreground },
                  pressed && !on && { backgroundColor: t.muted },
                ]}
              >
                <Ionicons name={on ? 'checkmark' : k.iconName} size={icon.sm} color={on ? t.card : t.foreground} />
                <Text style={[t.font.label, { color: on ? t.card : t.foreground }]}>{k.name}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// Add or edit a rule. `draft`: { id?, kind, value, tagId } (id = editing).
// After saving, if saved posts match and lack the tag, it offers 套用到現有收藏.
// `onDone(result)`: { rule, created, applied?: postIds } | { deleted: rule } | null (closed).
// `initialStep: 'confirmDelete'` opens straight at the delete question (a row's trash button).
export function RuleEditSheet({ draft, index, onDone, initialStep = 'edit' }) {
  const t = useCollectionTheme();
  const scrollRef = useRef(null);
  const c = useCollection();
  const editing = !!draft.id;
  const [kind, setKind] = useState(draft.kind || 'author');
  const [value, setValue] = useState(draft.value || '');
  const [tagId, setTagId] = useState(draft.tagId && index.byId[draft.tagId] ? draft.tagId : null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(initialStep); // edit | offer | confirmDelete
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const preview = { kind, value: normalizeRuleValue(kind, value), tagId };
  const readable = c.posts.filter((p) => p.status !== 'loading' && p.status !== 'failed');
  const matching = preview.value ? readable.filter((p) => ruleMatches(preview, p)).length : 0;
  const missing = preview.value && tagId ? postsToTag(preview, c.posts, c.tags).length : 0;
  const tag = tagId && index.byId[tagId];
  const savedTag = saved && index.byId[saved.tagId];
  const offerCount = saved ? postsToTag(saved, c.posts, c.tags).length : 0;

  const save = async () => {
    const problem = ruleError({ kind, value, tagId }, c.rules, c.tags, draft.id);
    if (problem) return setError(problem);
    setBusy(true);
    const rule = editing ? await c.updateRule(draft.id, { kind, value, tagId }) : await c.createRule({ kind, value, tagId });
    setBusy(false);
    if (postsToTag(rule, c.posts, c.tags).length) {
      setSaved(rule);
      setStep('offer');
    } else onDone({ rule, created: !editing });
  };

  const apply = async () => {
    setBusy(true);
    const ids = await c.applyRule(saved);
    onDone({ rule: saved, created: !editing, applied: ids });
  };

  const close = () => (step === 'offer' ? onDone({ rule: saved, created: !editing }) : onDone(null));
  const toggleTag = (id) => {
    setTagId((cur) => (cur === id ? null : id));
    setError(null);
  };

  let title = editing ? '編輯規則' : '新增規則';
  let body;
  let footer;
  if (step === 'offer') {
    title = editing ? '規則已更新' : '規則已建立';
    body = (
      <View style={styles.offer}>
        <View style={[styles.ruleLine, { borderColor: t.border }]}>
          <Text style={[t.font.body, { color: t.foreground }]}>{ruleText(saved)}</Text>
          <View style={styles.arrowRow}>
            <Ionicons name="arrow-forward" size={icon.sm} color={t.mutedForeground} />
            {savedTag && <TagMark hue={tagHue(savedTag, index.byId)} size="md" />}
            <Text style={[t.font.label, { color: t.foreground }]}>{savedTag ? tagLabel(savedTag, index.byId) : ''}</Text>
          </View>
        </View>
        <Text style={[t.font.body, { color: t.foreground }]}>
          現有的收藏裡有 {offerCount} 篇符合，要也幫它們加上「{savedTag?.name}」嗎？之後新收藏的貼文都會自動加上。
        </Text>
      </View>
    );
    footer = (
      <View style={styles.footerRow}>
        <SecondaryButton title="先不用" onPress={close} />
        <View style={styles.flex}>
          <PrimaryButton title={`套用到 ${offerCount} 篇`} onPress={apply} disabled={busy} />
        </View>
      </View>
    );
  } else if (step === 'confirmDelete') {
    title = '刪除規則？';
    body = (
      <Text style={[t.font.body, styles.offer, { color: t.foreground }]}>
        之後收藏的貼文不會再因為「{ruleText({ kind: draft.kind, value: draft.value })}」自動加上「{index.byId[draft.tagId]?.name}」。已經加上的標籤會留著。
      </Text>
    );
    footer = (
      <View style={styles.footerRow}>
        <SecondaryButton title="取消" onPress={() => (initialStep === 'confirmDelete' ? onDone(null) : setStep('edit'))} />
        <SecondaryButton
          title="刪除規則"
          iconName="trash-outline"
          danger
          onPress={async () => {
            await c.deleteRule(draft.id);
            onDone({ deleted: draft });
          }}
        />
      </View>
    );
  } else {
    body = (
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={[t.font.kicker, { color: t.mutedForeground }]}>條件</Text>
        <KindSwitch
          value={kind}
          onChange={(k) => {
            setKind(k);
            setError(null);
          }}
        />
        <View style={[styles.inputRow, { borderRadius: t.radius.sm, borderColor: error && !error.includes('標籤') ? t.danger : t.outline, backgroundColor: t.card }]}>
          {kind === 'author' && <Text style={[t.font.body, { color: t.mutedForeground }]}>@</Text>}
          <TextInput
            value={value}
            onChangeText={(v) => {
              // The 「@」 is already printed in front of the box.
              setValue(kind === 'author' ? v.replace(/^@+/, '') : v);
              setError(null);
            }}
            autoFocus={!draft.value}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            placeholder={kind === 'author' ? '作者帳號，例如 starlight.daily' : '例如：巡演、拉麵'}
            placeholderTextColor={t.mutedForeground}
            accessibilityLabel={kind === 'author' ? '作者帳號' : '內文關鍵字'}
            style={[t.font.body, styles.input, { color: t.foreground }]}
          />
        </View>
        <Text style={[t.font.meta, { color: t.mutedForeground }]} accessibilityLiveRegion="polite">
          {!preview.value
            ? kind === 'author'
              ? '收藏這位作者的貼文時，自動加上標籤。'
              : '貼文內文提到這個詞時，自動加上標籤（不分大小寫）。'
            : `目前的收藏裡有 ${matching} 篇${kind === 'author' ? `是 @${preview.value} 的` : `提到「${preview.value}」`}${tag && matching ? `，其中 ${missing} 篇還沒有「${tag.name}」` : ''}。`}
        </Text>
        <Text style={[t.font.kicker, styles.gap, { color: t.mutedForeground }]}>加上標籤</Text>
        <TagPicker
          index={index}
          selected={tagId ? [tagId] : []}
          onToggle={toggleTag}
          onCreate={c.createTag}
          recentIds={c.recent}
          onFormFocus={() => scrollToEndForKeyboard(scrollRef)}
        />
        {error && (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={icon.sm} color={t.danger} />
            <Text style={[t.font.meta, { color: t.danger }]}>{error}</Text>
          </View>
        )}
      </ScrollView>
    );
    footer = (
      <View style={styles.footerRow}>
        {editing && <SecondaryButton title="刪除" iconName="trash-outline" danger onPress={() => setStep('confirmDelete')} />}
        <View style={styles.flex}>
          <PrimaryButton title={editing ? '儲存' : '建立規則'} onPress={save} disabled={busy} />
        </View>
      </View>
    );
  }

  return (
    <Sheet visible onClose={close} title={title} footer={<View style={styles.footer}>{footer}</View>}>
      {body}
    </Sheet>
  );
}

// The toast after the editor closes: names what happened; 套用 can be undone.
export function ruleResultToast(result, index, unapply) {
  if (!result) return null;
  if (result.deleted) return { message: '已刪除規則' };
  const name = index.byId[result.rule.tagId]?.name || '';
  if (result.applied?.length) {
    const ids = result.applied;
    return {
      message: `已幫 ${ids.length} 篇加上「${name}」`,
      undo: true,
      onUndo: () => unapply(result.rule.tagId, ids),
    };
  }
  return { message: result.created ? `已建立規則：${ruleText(result.rule)} → ${name}` : '規則已更新' };
}

function RuleRow({ rule, index, onEdit, onDelete }) {
  const t = useCollectionTheme();
  const tag = index.byId[rule.tagId];
  if (!tag) return null;
  const label = tagLabel(tag, index.byId);
  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${ruleText(rule)}，自動加上「${label}」`}
        accessibilityHint="編輯規則"
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: t.muted }]}
      >
        <Ionicons name={rule.kind === 'author' ? 'person-outline' : 'text-outline'} size={icon.md} color={t.foreground} />
        <View style={styles.flex}>
          <Text style={[t.font.body, { color: t.foreground }]} numberOfLines={1}>
            {ruleText(rule)}
          </Text>
          <View style={styles.arrowRow}>
            <Ionicons name="arrow-forward" size={icon.sm} color={t.mutedForeground} />
            <TagMark hue={tagHue(tag, index.byId)} size="sm" />
            <Text style={[t.font.label, styles.flexShrink, { color: t.foreground }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
      </Pressable>
      <IconButton name="trash-outline" label={`刪除規則：${ruleText(rule)}`} color={t.mutedForeground} size={icon.md} onPress={onDelete} />
    </View>
  );
}

// 設定 › 自動標籤規則.
export function RulesPage({ index, onClose }) {
  const t = useCollectionTheme();
  const c = useCollection();
  const [editing, setEditing] = useState(null); // { id?, rule: draft, step? }
  const [toast, setToast] = useState(null);
  const hideToast = useCallback(() => setToast(null), []);
  const rules = c.rules.filter((r) => index.byId[r.tagId]);

  return (
    <Page
      title="自動標籤規則"
      onClose={onClose}
      footer={<PrimaryButton title="新增規則" iconName="add" onPress={() => setEditing({ rule: { kind: 'author', value: '', tagId: null } })} />}
    >
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[t.font.meta, styles.intro, { color: t.mutedForeground }]}>
          新收藏的貼文符合條件時，會自動加上標籤。收藏面板會先幫你勾好並寫出原因，不想要可以取消。
        </Text>
        {rules.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="color-wand-outline" size={28} color={t.mutedForeground} />
            <Text style={[t.font.title, { color: t.foreground }]}>還沒有規則</Text>
            <Text style={[t.font.body, { color: t.mutedForeground }]}>
              例如「作者 @starlight.daily → 追星」，或「內文提到「拉麵」→ 美食」。也可以在貼文的「更多」選單裡為作者建立。
            </Text>
          </View>
        ) : (
          rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              onEdit={() => setEditing({ id: rule.id, rule })}
              onDelete={() => setEditing({ id: rule.id, rule, step: 'confirmDelete' })}
            />
          ))
        )}
      </ScrollView>
      {editing && (
        <RuleEditSheet
          key={`${editing.id || 'new'}-${editing.step || 'edit'}`}
          draft={editing.rule}
          initialStep={editing.step}
          index={index}
          onDone={(result) => {
            setEditing(null);
            setToast(ruleResultToast(result, index, async (tagId, ids) => {
              await c.unapplyRule(tagId, ids);
              setToast({ message: '已復原' });
            }));
          }}
        />
      )}
      <Toast toast={toast} onUndo={() => toast?.onUndo?.()} onHide={hideToast} />
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  form: { gap: space.sm, paddingBottom: space.md },
  gap: { marginTop: space.sm },
  segments: { flexDirection: 'row' },
  segmentTarget: { minHeight: TOUCH, justifyContent: 'center' },
  joined: { marginLeft: -1 },
  segment: {
    height: 40,
    borderWidth: 1,
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: space.md,
  },
  inputRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, paddingLeft: space.md },
  input: { flex: 1, minHeight: TOUCH, paddingRight: space.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  footer: { paddingTop: space.sm },
  footerRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  offer: { gap: space.md, paddingBottom: space.md },
  ruleLine: { gap: 2, paddingBottom: space.md, borderBottomWidth: RULE },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { paddingHorizontal: 20 - space.sm, paddingVertical: space.sm },
  intro: { paddingHorizontal: space.sm, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: RULE },
  rowMain: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.sm },
  empty: { gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xl, alignItems: 'flex-start' },
});
