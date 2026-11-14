#!/usr/bin/env node
'use strict';
/* Guitar Habit server: static files + a tiny JSON API. No dependencies.
   State lives in data/state.json and is written atomically. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 4321;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TOTAL_DAYS = 84;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// ---------- state ----------
function todayLocal() {
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function defaultState() {
  return {
    version: 1,
    profile: { name: '', startDate: todayLocal(), songs: ['horse', 'knockin'], homework: { chords: [], minutes: 3 } },
    progress: { currentDay: 1 },
    sessions: [],          // { ts, date, day, minutes, mood, win, short, blocks }
    metrics: { changes: [], tempo: [] }, // changes: { ts, date, pair, count }  tempo: { ts, date, song, bpm }
    badges: [],            // { id, date }
  };
}
function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const s = defaultState();
    Object.assign(s.profile, raw.profile || {});
    if (!s.profile.homework || !Array.isArray(s.profile.homework.chords)) s.profile.homework = { chords: [], minutes: 3 };
    Object.assign(s.progress, raw.progress || {});
    s.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
    s.metrics.changes = (raw.metrics && raw.metrics.changes) || [];
    s.metrics.tempo = (raw.metrics && raw.metrics.tempo) || [];
    s.badges = Array.isArray(raw.badges) ? raw.badges : [];
    return s;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Could not read state, starting fresh:', e.message);
    return defaultState();
  }
}
function saveState(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}
let state = loadState();

// ---------- derived stats ----------
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const dayNum = d => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);

function computeStats(s, today) {
  const dates = [...new Set(s.sessions.map(x => x.date).filter(isDate))].sort();
  let best = 0, run = 0, prev = null;
  for (const d of dates) {
    const n = dayNum(d);
    run = (prev !== null && n === prev + 1) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const last = dates[dates.length - 1] || null;
  const daysSinceLast = last ? dayNum(today) - dayNum(last) : null;
  const streak = last && daysSinceLast <= 1 ? run : 0;
  return {
    streak, bestStreak: best, totalSessions: s.sessions.length,
    totalMinutes: s.sessions.reduce((a, x) => a + (Number(x.minutes) || 0), 0),
    lastDate: last, daysSinceLast, practicedToday: dates.includes(today),
    todaySessions: s.sessions.filter(x => x.date === today),
    practiceDates: dates,
  };
}

const BADGES = [
  { id: 'first',      name: 'First strum',      desc: 'Showed up for day one.',                          test: (s, st) => st.totalSessions >= 1 },
  { id: 'streak7',    name: 'Seven straight',   desc: 'A full week without missing.',                   test: (s, st) => st.bestStreak >= 7 },
  { id: 'streak30',   name: 'Thirty straight',  desc: 'A month of daily practice.',                     test: (s, st) => st.bestStreak >= 30 },
  { id: 'comeback',   name: 'Came back',        desc: 'Missed a few days and returned anyway. That is the whole skill.', test: (s, st, ctx) => ctx.gapBefore >= 3 },
  { id: 'week4',      name: 'Twenty bars',      desc: 'Finished week 4. The song has begun.',           test: s => s.progress.currentDay > 28 },
  { id: 'song1',      name: 'A Horse with No Name', desc: 'Week 8 complete. You can play a song.',     test: s => s.progress.currentDay > 56 },
  { id: 'song2',      name: "Knockin' on Heaven's Door", desc: 'Week 12 complete. Two songs.',         test: s => s.progress.currentDay > 84 },
  { id: 'changes20',  name: 'Quick hands',      desc: '20 chord changes in one minute.',                test: s => s.metrics.changes.some(m => m.count >= 20) },
  { id: 'changes30',  name: 'Quicker hands',    desc: '30 chord changes in one minute.',                test: s => s.metrics.changes.some(m => m.count >= 30) },
  { id: 'sessions50', name: 'Fifty sessions',   desc: 'Twelve and a half hours of guitar, fifteen minutes at a time.', test: (s, st) => st.totalSessions >= 50 },
];
function awardBadges(s, today, ctx = {}) {
  const st = computeStats(s, today);
  const have = new Set(s.badges.map(b => b.id));
  const fresh = [];
  for (const b of BADGES) {
    if (!have.has(b.id) && b.test(s, st, ctx)) { s.badges.push({ id: b.id, date: today }); fresh.push(b.id); }
  }
  return fresh;
}

function publicState(today) {
  return { ...state, stats: computeStats(state, today), badgeDefs: BADGES.map(({ id, name, desc }) => ({ id, name, desc })), totalDays: TOTAL_DAYS };
}

// ---------- http helpers ----------
function send(res, code, body, type = 'application/json') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = ''; req.setEncoding('utf8');
    req.on('data', c => { buf += c; if (buf.length > 1e6) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });
}
const clampInt = (v, lo, hi, dflt) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

// ---------- api ----------
async function api(req, res, url) {
  const today = isDate(url.searchParams.get('today')) ? url.searchParams.get('today') : todayLocal();
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/state') return send(res, 200, publicState(today));

  if (route === 'GET /api/export') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="guitar-habit-${today}.json"` });
    return res.end(JSON.stringify(state, null, 2));
  }

  if (route === 'POST /api/session') {
    const b = await readBody(req);
    const date = isDate(b.date) ? b.date : today;
    const before = computeStats(state, date);
    const gapBefore = before.daysSinceLast == null ? 0 : before.daysSinceLast;
    const day = clampInt(b.day, 1, 100000, state.progress.currentDay);
    const session = {
      ts: Date.now(), date, day,
      minutes: clampInt(b.minutes, 1, 180, 15),
      mood: clampInt(b.mood, 1, 5, 3),
      win: str(b.win, 280),
      short: !!b.short,
      replay: !!b.replay,
      blocks: clampInt(b.blocks, 0, 50, 0),
    };
    state.sessions.push(session);
    // A replay of any lesson counts as practice (streak, minutes) but never moves the program forward.
    if (!session.replay && day >= state.progress.currentDay) state.progress.currentDay = day + 1;
    const newBadges = awardBadges(state, date, { gapBefore });
    saveState(state);
    return send(res, 200, { ...publicState(date), newBadges });
  }

  if (route === 'POST /api/metric') {
    const b = await readBody(req);
    const date = isDate(b.date) ? b.date : today;
    if (b.type === 'changes') {
      const pair = Array.isArray(b.pair) ? b.pair.map(x => str(x, 8)).slice(0, 2) : null;
      if (!pair || pair.length !== 2) return send(res, 400, { error: 'pair required' });
      state.metrics.changes.push({ ts: Date.now(), date, pair, count: clampInt(b.count, 0, 300, 0) });
    } else if (b.type === 'tempo') {
      state.metrics.tempo.push({ ts: Date.now(), date, song: str(b.song, 32), bpm: clampInt(b.bpm, 20, 300, 60) });
    } else return send(res, 400, { error: 'unknown metric type' });
    const newBadges = awardBadges(state, date);
    saveState(state);
    return send(res, 200, { ...publicState(date), newBadges });
  }

  if (route === 'POST /api/profile') {
    const b = await readBody(req);
    if ('name' in b) state.profile.name = str(b.name, 40);
    if ('currentDay' in b) state.progress.currentDay = clampInt(b.currentDay, 1, 100000, state.progress.currentDay);
    if (b.homework && typeof b.homework === 'object') {
      const chords = Array.isArray(b.homework.chords) ? b.homework.chords.map(c => str(c, 8).trim()).filter(Boolean).slice(0, 12) : [];
      state.profile.homework = { chords: [...new Set(chords)], minutes: clampInt(b.homework.minutes, 1, 10, 3) };
    }
    saveState(state);
    return send(res, 200, publicState(today));
  }

  if (route === 'DELETE /api/session') {
    const ts = Number(url.searchParams.get('ts'));
    const i = state.sessions.findIndex(s => s.ts === ts);
    if (i < 0) return send(res, 404, { error: 'not found' });
    state.sessions.splice(i, 1);
    saveState(state);
    return send(res, 200, publicState(today));
  }

  if (route === 'POST /api/reset') {
    const b = await readBody(req);
    if (b.confirm !== 'RESET') return send(res, 400, { error: 'send {"confirm":"RESET"}' });
    if (fs.existsSync(STATE_FILE)) fs.copyFileSync(STATE_FILE, path.join(DATA_DIR, `state-backup-${Date.now()}.json`));
    state = defaultState();
    saveState(state);
    return send(res, 200, publicState(today));
  }

  send(res, 404, { error: 'no such route' });
}

// ---------- static ----------
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'forbidden', 'text/plain');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // SPA fallback for hash-less deep links
      if (!path.extname(p)) return fs.readFile(path.join(PUBLIC, 'index.html'), (e, d) => e ? send(res, 404, 'not found', 'text/plain') : send(res, 200, d, MIME['.html']));
      return send(res, 404, 'not found', 'text/plain');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`Guitar Habit is running.`);
  console.log(`  On this Mac:     http://localhost:${PORT}`);
  console.log(`  On your phone:   http://${os.hostname().replace(/\.local$/, '')}.local:${PORT}`);
  for (const ip of ips) console.log(`                   http://${ip}:${PORT}`);
  console.log(`  Data file:       ${STATE_FILE}`);
});
