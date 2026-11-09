#!/usr/bin/env node
// Runs every browser E2E suite against the web export, in light and dark (and
// the 底片 variants of the suites that support a theme), a few at a time.
// A suite that fails is run once more: passing then marks it flaky, failing
// again fails the run.
//
// usage: node e2e/run.mjs [--build] [--only core,tabs] [--scheme light|dark]
//                         [--theme editorial|film] [--jobs 3] [--web <dir>]
//   --build   export the web build into e2e/.out/web first (npx expo export --platform web)
//   --only    comma-separated suite names (file names in e2e/ without .cjs)
//   --jobs    suites running at once (default 3, or E2E_JOBS); more than 3 got flaky
// Env: E2E_CHROMIUM=<chromium binary>, E2E_TIMEOUT=<seconds per suite, default 600>.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.dirname(E2E_DIR);
const OUT_DIR = path.join(E2E_DIR, '.out');

// Longest first, so the slow ones don't end up running alone at the end.
const SUITES = [
  { name: 'selection-author', themes: ['editorial', 'film'] },
  { name: 'rules-notes', themes: ['editorial', 'film'] },
  { name: 'tabs' },
  { name: 'quick-save' },
  { name: 'core' },
  { name: 'auto-backup' },
  { name: 'film-theme' },
  { name: 'video' },
  { name: 'fetch-health' },
  { name: 'update' },
];
const SCHEMES = ['light', 'dark'];

function parseArgs(argv) {
  const args = { build: false, only: null, scheme: null, theme: null, jobs: Number(process.env.E2E_JOBS) || 3, web: path.join(OUT_DIR, 'web') };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=', 2);
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case '--build': args.build = true; break;
      case '--only': args.only = (args.only || []).concat(value().split(',').map((s) => s.trim().replace(/\.cjs$/, '')).filter(Boolean)); break;
      case '--scheme': args.scheme = value(); break;
      case '--theme': args.theme = value(); break;
      case '--jobs': args.jobs = Number(value()); break;
      case '--web': args.web = path.resolve(value()); break;
      case '-h': case '--help':
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
        process.exit(0);
      default:
        console.error(`Unknown argument: ${argv[i]} (try --help)`);
        process.exit(2);
    }
  }
  if (args.scheme && !SCHEMES.includes(args.scheme)) { console.error(`--scheme must be light or dark, not "${args.scheme}"`); process.exit(2); }
  if (!(args.jobs >= 1)) { console.error('--jobs must be a positive number'); process.exit(2); }
  const unknown = (args.only || []).filter((n) => !SUITES.some((s) => s.name === n));
  if (unknown.length) { console.error(`Unknown suite(s): ${unknown.join(', ')}. Suites: ${SUITES.map((s) => s.name).join(', ')}`); process.exit(2); }
  return args;
}

function build(web) {
  console.log(`Exporting the web build to ${path.relative(APP_DIR, web)} …`);
  const started = Date.now();
  const res = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', path.relative(APP_DIR, web)], {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) { console.error('Web export failed.'); process.exit(res.status || 1); }
  console.log(`Web export done in ${secs(Date.now() - started)}.\n`);
}

const secs = (ms) => `${Math.round(ms / 1000)}s`;
const label = (job) => [job.suite, job.scheme, job.theme !== 'editorial' ? job.theme : null].filter(Boolean).join(' · ');

// One attempt: node <suite> <web> <shots> <scheme> <theme>, output to a log file.
function attempt(job, web, n) {
  return new Promise((resolve) => {
    const started = Date.now();
    const log = path.join(OUT_DIR, 'logs', `${job.id}${n > 1 ? `.try${n}` : ''}.log`);
    const child = spawn(process.execPath, [path.join(E2E_DIR, `${job.suite}.cjs`), web, job.out, job.scheme, job.theme], {
      cwd: APP_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    // The suite has its own watchdog (E2E_TIMEOUT); this one catches a hung browser.
    const limit = ((Number(process.env.E2E_TIMEOUT) || 600) + 60) * 1000;
    const killer = setTimeout(() => { output += `\nFAIL killed after ${secs(limit)}\n`; child.kill('SIGKILL'); }, limit);
    child.on('close', (code) => {
      clearTimeout(killer);
      fs.writeFileSync(log, output);
      const lines = output.split('\n');
      const pass = lines.filter((l) => l.startsWith('PASS ')).length;
      const fails = lines.filter((l) => l.startsWith('FAIL '));
      resolve({ ok: code === 0 && fails.length === 0 && pass > 0, code, pass, fails, ms: Date.now() - started, log, output });
    });
  });
}

async function runJob(job, web) {
  const first = await attempt(job, web, 1);
  if (first.ok) {
    console.log(`ok     ${label(job)} — ${first.pass} checks, ${secs(first.ms)}`);
    return { ...job, status: 'pass', attempts: [first] };
  }
  console.log(`retry  ${label(job)} — exit ${first.code}, ${first.fails.length} failed (${path.relative(APP_DIR, first.log)})`);
  for (const f of first.fails.slice(0, 5)) console.log(`         ${f}`);
  const second = await attempt(job, web, 2);
  if (second.ok) {
    console.log(`flaky  ${label(job)} — passed on retry, ${second.pass} checks, ${secs(second.ms)}`);
    return { ...job, status: 'flaky', attempts: [first, second] };
  }
  console.log(`FAIL   ${label(job)} — failed twice (${path.relative(APP_DIR, second.log)})`);
  for (const f of second.fails.slice(0, 10)) console.log(`         ${f}`);
  if (!second.fails.length) console.log(second.output.split('\n').slice(-15).map((l) => `         ${l}`).join('\n'));
  return { ...job, status: 'fail', attempts: [first, second] };
}

// Runs fn over items with at most `limit` in flight; keeps the input order.
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function table(rows) {
  const head = ['suite', 'scheme', 'theme', 'result', 'checks', 'time'];
  const body = rows.map((r) => {
    const last = r.attempts[r.attempts.length - 1];
    return [r.suite, r.scheme, r.theme, r.status === 'pass' ? 'pass' : r.status === 'flaky' ? 'FLAKY (passed on retry)' : 'FAIL', `${last.pass}/${last.pass + last.fails.length}`, r.attempts.map((a) => secs(a.ms)).join(' + ')];
  });
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => String(b[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd();
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...body.map(line)].join('\n');
}

const args = parseArgs(process.argv.slice(2));
const started = Date.now();
if (args.build) build(args.web);
if (!fs.existsSync(path.join(args.web, 'index.html'))) {
  console.error(`No web export at ${args.web}. Run with --build (npm run e2e does).`);
  process.exit(2);
}

const jobs = [];
for (const s of SUITES) {
  if (args.only && !args.only.includes(s.name)) continue;
  for (const scheme of SCHEMES) {
    if (args.scheme && scheme !== args.scheme) continue;
    for (const theme of s.themes || ['editorial']) {
      if (args.theme && theme !== args.theme) continue;
      const id = [s.name, scheme, theme !== 'editorial' ? theme : null].filter(Boolean).join('-');
      jobs.push({ id, suite: s.name, scheme, theme, out: path.join(OUT_DIR, 'shots', id) });
    }
  }
}
if (!jobs.length) { console.error('Nothing to run with these filters.'); process.exit(2); }
fs.mkdirSync(path.join(OUT_DIR, 'logs'), { recursive: true });
for (const job of jobs) {
  fs.rmSync(job.out, { recursive: true, force: true });
  for (const f of fs.readdirSync(path.join(OUT_DIR, 'logs'))) if (f.startsWith(`${job.id}.`)) fs.rmSync(path.join(OUT_DIR, 'logs', f));
}

console.log(`Running ${jobs.length} suite runs, ${args.jobs} at a time${process.env.E2E_CHROMIUM ? ` (Chromium: ${process.env.E2E_CHROMIUM})` : ''}.\n`);
const results = await pool(jobs, args.jobs, (job) => runJob(job, args.web));

const failed = results.filter((r) => r.status === 'fail');
const flaky = results.filter((r) => r.status === 'flaky');
console.log(`\n${table(results)}\n`);
console.log(`${results.length - failed.length - flaky.length} passed, ${flaky.length} flaky, ${failed.length} failed in ${secs(Date.now() - started)}. Logs and screenshots: ${path.relative(APP_DIR, OUT_DIR)}/`);
if (flaky.length) console.log(`Flaky (failed once, passed on retry): ${flaky.map(label).join(', ')}`);
process.exit(failed.length ? 1 : 0);
