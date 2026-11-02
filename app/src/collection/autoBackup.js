import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { autoBackupFileName, makeBackup } from './backup';
import {
  backupReminder,
  collectionMarker,
  folderLabel,
  planPrune,
  rememberFile,
  resolveBackupFiles,
  shouldAutoBackup,
} from './backupSchedule';
import { deleteBackupFile, listBackupFolder, pickBackupFolder, writeBackupFile } from './backupIO';

// SQLite meta keys (strings; '' means unset).
const META = {
  folder: 'backup_folder', // content:// tree URI of the picked folder
  lastAt: 'backup_last_at', // last successful automatic/立即備份 write
  marker: 'backup_marker', // collectionMarker() at that write
  manualAt: 'backup_manual_at', // last 匯出備份 (share sheet)
  error: 'backup_error', // '' | 'folder' | 'write'
  files: 'backup_files', // [{ uri, name }] we wrote, for pruning opaque folders
  noteAt: 'backup_note_at', // when the wall reminder was last shown
};
// Let launch work (loading, background refreshes) settle before backing up.
const LAUNCH_DELAY_MS = 2500;

const num = (v) => (v ? Number(v) || null : null);

// Automatic backup into a folder the user picked, plus the backup reminder.
// Runs on launch and whenever the app goes to the background; the rules live
// in backupSchedule.js. Failures never interrupt the user: they only show up as
// a status line in settings.
export function useAutoBackup({ repo, ready, posts, postsRef, tagsRef }) {
  // `now` is refreshed on every update and when the app comes back to the
  // foreground, so 「今天 / 昨天」 and the reminder never read the clock during render.
  const [state, setState] = useState({ loaded: false, folderUri: null, lastAt: null, manualAt: null, error: null, noteAt: null, now: 0 });
  const [busy, setBusy] = useState(false);
  const [wallNote, setWallNote] = useState(false);
  const current = useRef(state);
  const running = useRef(false);
  const failedAt = useRef(null);

  const update = useCallback((fields) => {
    current.current = { ...current.current, now: Date.now(), ...fields };
    setState(current.current);
  }, []);

  // The wall note is decided on launch and when the app returns to the foreground;
  // showing it starts its 30-day quiet period (so it appears at most once a month).
  const decideWallNote = useCallback(async () => {
    const cur = current.current;
    const now = Date.now();
    const lastBackupAt = Math.max(cur.lastAt || 0, cur.manualAt || 0) || null;
    const { wall } = backupReminder({ autoOn: !!cur.folderUri, lastBackupAt, posts: postsRef.current, noteShownAt: cur.noteAt, now });
    if (!wall) return;
    await repo.current.setMeta(META.noteAt, String(now));
    update({ noteAt: now });
    setWallNote(true);
  }, [repo, postsRef, update]);

  useEffect(() => {
    if (!ready || current.current.loaded) return;
    (async () => {
      const r = repo.current;
      const [folder, lastAt, manualAt, error, noteAt] = await Promise.all(
        [META.folder, META.lastAt, META.manualAt, META.error, META.noteAt].map((k) => r.getMeta(k)),
      );
      update({ loaded: true, folderUri: folder || null, lastAt: num(lastAt), manualAt: num(manualAt), error: error || null, noteAt: num(noteAt) });
      await decideWallNote();
    })();
  }, [ready, repo, update, decideWallNote]);

  // Writes a backup now if the rules allow it (or always with `force`).
  // Resolves to 'ok' | 'skipped' | 'folder' | 'write'.
  const run = useCallback(
    async ({ force = false } = {}) => {
      const r = repo.current;
      const cur = current.current;
      if (!r || !cur.loaded || !cur.folderUri || running.current) return 'skipped';
      const now = Date.now();
      const marker = collectionMarker(postsRef.current, tagsRef.current);
      if (!force) {
        const lastMarker = await r.getMeta(META.marker);
        const due = shouldAutoBackup({ folderUri: cur.folderUri, lastAt: cur.lastAt, lastMarker, marker, lastFailedAt: failedAt.current, now });
        if (!due) return 'skipped';
      }
      running.current = true;
      setBusy(true);
      try {
        const json = JSON.stringify(makeBackup(postsRef.current, tagsRef.current, now), null, 1);
        const written = await writeBackupFile(cur.folderUri, autoBackupFileName(now), json);
        let own = rememberFile(JSON.parse((await r.getMeta(META.files)) || '[]'), written);
        try {
          for (const f of planPrune(resolveBackupFiles(listBackupFolder(cur.folderUri), own))) {
            deleteBackupFile(f.uri);
            own = own.filter((x) => x.uri !== f.uri);
          }
        } catch {
          // Pruning is best effort; the new backup is already safe.
        }
        await r.setMeta(META.files, JSON.stringify(own));
        await r.setMeta(META.lastAt, String(now));
        await r.setMeta(META.marker, marker);
        await r.setMeta(META.error, '');
        failedAt.current = null;
        update({ lastAt: now, error: null });
        return 'ok';
      } catch (e) {
        failedAt.current = now;
        const error = e?.kind === 'folder' ? 'folder' : 'write';
        await r.setMeta(META.error, error);
        update({ error });
        return error;
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [repo, postsRef, tagsRef, update],
  );

  // On launch (once loaded) and every time the app goes to the background.
  useEffect(() => {
    if (!state.loaded) return;
    const timer = setTimeout(() => run(), LAUNCH_DELAY_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') run();
      else if (next === 'active') {
        update({});
        decideWallNote();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [state.loaded, run, update, decideWallNote]);

  // Opens the folder picker; on a pick, remembers the folder and backs up right away.
  // Resolves to 'cancelled' | 'ok' | 'folder' | 'write' | 'picker'.
  const chooseFolder = useCallback(async () => {
    let uri;
    try {
      uri = await pickBackupFolder();
    } catch {
      return 'picker';
    }
    if (!uri) return 'cancelled';
    await repo.current.setMeta(META.folder, uri);
    await repo.current.setMeta(META.error, '');
    failedAt.current = null;
    update({ folderUri: uri, error: null });
    return run({ force: true });
  }, [repo, run, update]);

  const backupNow = useCallback(() => run({ force: true }), [run]);

  const turnOff = useCallback(async () => {
    await repo.current.setMeta(META.folder, '');
    await repo.current.setMeta(META.error, '');
    update({ folderUri: null, error: null });
  }, [repo, update]);

  // 匯出備份 through the share sheet counts as a backup for the reminder.
  const noteManualExport = useCallback(() => {
    const now = Date.now();
    repo.current?.setMeta(META.manualAt, String(now));
    update({ manualAt: now });
  }, [repo, update]);

  const lastBackupAt = Math.max(state.lastAt || 0, state.manualAt || 0) || null;
  const reminder = useMemo(
    () =>
      state.loaded
        ? backupReminder({ autoOn: !!state.folderUri, lastBackupAt, posts, noteShownAt: state.noteAt, now: state.now })
        : { settings: false, wall: false },
    [state.loaded, state.folderUri, state.noteAt, state.now, lastBackupAt, posts],
  );

  const dismissWallNote = useCallback(() => setWallNote(false), []);

  return useMemo(
    () => ({
      loaded: state.loaded,
      folderUri: state.folderUri,
      folderLabel: folderLabel(state.folderUri),
      lastAt: state.lastAt,
      lastBackupAt,
      now: state.now,
      error: state.error,
      busy,
      reminder: { settings: reminder.settings, never: !!reminder.never, count: reminder.count || 0 },
      // Hide the wall note again once auto backup is on or a backup was made.
      wallNote: wallNote && reminder.settings,
      chooseFolder,
      backupNow,
      turnOff,
      noteManualExport,
      dismissWallNote,
    }),
    [state.loaded, state.folderUri, state.lastAt, state.now, state.error, lastBackupAt, busy, reminder, wallNote,
      chooseFolder, backupNow, turnOff, noteManualExport, dismissWallNote],
  );
}
