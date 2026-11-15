/* Guitar Habit client. Vanilla JS, hash routing, talks to /api. */
(() => {
'use strict';
const C = window.CURRICULUM;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const fmtLong = d => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const MOODS = ['😖', '😕', '🙂', '😀', '🤩'];
const MOOD_WORDS = ['Rough', 'Meh', 'Fine', 'Good', 'Great'];
const BLOCK_ICON = { text: '🧘', chord: '🖐️', changes: '⚡', metronome: '🥁', playalong: '🎵' };
const BADGE_ICON = { first: '🎸', streak7: '🔥', streak30: '🌋', comeback: '🌱', week4: '🎼', song1: '🐎', song2: '🚪', song3: '🐦', changes20: '⚡', changes30: '⚡', sessions50: '🏆' };

const S = { data: null, route: 'today', param: null, newBadges: null, toolPair: null };
const homework = () => (S.data && S.data.profile.homework) || { chords: [], minutes: 3 };
const plan = n => C.buildDay(n, { homework: homework() });

// ---------- api ----------
async function api(method, path, body) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`/api${path}${sep}today=${localDate()}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}
function setData(d) { if (d && d.newBadges) { S.newBadges = d.newBadges; delete d.newBadges; } S.data = d; }
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2400); }

// ---------- audio ----------
const Snd = {
  ctx: null,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  blip(t, freq, gain = 0.3, dur = 0.05) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  tone(freq, dur = 2.4) {
    const ctx = this.ensure(), t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 'triangle', 1], [2, 'sine', 0.18], [3, 'sine', 0.06]].forEach(([mult, type, vol]) => {
      const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = type; o.frequency.value = freq * mult; gg.gain.value = vol;
      o.connect(gg).connect(g); o.start(t); o.stop(t + dur);
    });
    g.connect(ctx.destination);
  },
  chime() {
    const ctx = this.ensure(), t = ctx.currentTime;
    [[659, 0], [880, 0.14], [1319, 0.28]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.7);
      o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.8);
    });
  },
};

// Lookahead metronome. Eighth-note resolution, click on quarters, accent on the one.
const Metro = {
  running: false, bpm: 80, eighth: 0, nextTime: 0, timer: null, onTick: null, owner: null,
  start(bpm, owner) {
    const ctx = Snd.ensure(); this.stop();
    this.bpm = bpm; this.owner = owner; this.running = true; this.eighth = 0; this.nextTime = ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 25); this.schedule();
  },
  schedule() {
    const ctx = Snd.ctx;
    while (this.running && this.nextTime < ctx.currentTime + 0.12) {
      const e = this.eighth, t = this.nextTime;
      if (e % 2 === 0) Snd.blip(t, e % 8 === 0 ? 1320 : 880, e % 8 === 0 ? 0.35 : 0.2);
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => { if (this.running && this.onTick) this.onTick(e); }, delay);
      this.eighth++; this.nextTime += 30 / this.bpm;
    }
  },
  stop() { this.running = false; clearInterval(this.timer); this.timer = null; this.owner = null; this.onTick = null; },
  setBpm(b) { this.bpm = Math.min(240, Math.max(30, b)); },
};

// ---------- chord diagram ----------
function chordSVG(name, cls = '') {
  const c = C.CHORDS[name]; if (!c) return '';
  const W = 118, H = 148, left = 22, top = 38, sw = 15, fh = 24;
  let s = `<svg class="chord ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} chord">`;
  s += `<text x="${W / 2}" y="16" text-anchor="middle" class="cname">${esc(name)}</text>`;
  s += `<rect x="${left - 1.5}" y="${top - 3}" width="${sw * 5 + 3}" height="4" rx="1.5" class="nut"/>`;
  for (let f = 1; f <= 4; f++) s += `<line x1="${left}" y1="${top + f * fh}" x2="${left + sw * 5}" y2="${top + f * fh}" class="fret"/>`;
  for (let i = 0; i < 6; i++) s += `<line x1="${left + i * sw}" y1="${top}" x2="${left + i * sw}" y2="${top + 4 * fh}" class="string"/>`;
  c.frets.forEach((f, i) => {
    const x = left + i * sw;
    if (f === 'x') s += `<text x="${x}" y="${top - 9}" class="xo">×</text>`;
    else if (f === 0) s += `<circle cx="${x}" cy="${top - 13}" r="4" class="open"/>`;
    else { const y = top + (f - 0.5) * fh; s += `<circle cx="${x}" cy="${y}" r="7.5" class="dot"/><text x="${x}" y="${y + 3.5}" class="fnum">${c.fingers[i] || ''}</text>`; }
  });
  return s + '</svg>';
}
function chordCards(names, withTips = true) {
  return `<div class="chords">${names.map(n => `<div class="chord-card">${chordSVG(n)}</div>`).join('')}</div>` +
    (withTips ? names.map(n => `<p class="chord-tip"><b>${esc(n)}</b> · ${esc(C.CHORDS[n].tip)}</p>`).join('') : '');
}

// ---------- groove tool (metronome + chord trainer + play-along) ----------
function buildBars(block) {
  if (block.type === 'playalong') {
    const song = C.SONGS[block.song];
    const secs = block.sections === 'all' ? song.sections : song.sections.filter(s => block.sections.includes(s.name));
    const bars = []; secs.forEach(sec => sec.bars.forEach(ch => bars.push({ chord: ch, section: sec.name }))); return bars;
  }
  const bars = []; (block.chords || ['Em']).forEach(ch => { for (let i = 0; i < (block.barsPerChord || 1); i++) bars.push({ chord: ch, section: null }); });
  return bars;
}
function patternSlots(pattern) {
  return C.PATTERNS[pattern].slots.map((s, i) => `<span class="${s ? 'hit' : 'gap'}"><b>${s || '·'}</b><small>${i % 2 ? '&amp;' : i / 2 + 1}</small></span>`).join('');
}
function grooveHTML(id, o) {
  const pat = C.PATTERNS[o.pattern];
  const first = o.bars[0], second = o.bars[1] || o.bars[0];
  return `<div class="groove" id="${id}">
    <div class="groove-head"><span data-r="section">${esc(o.label || '')}</span><span data-r="bar">${o.plain ? '' : o.bars.length + ' bars'}</span></div>
    ${o.plain ? '' : `<div class="chord-now"><div class="now" data-r="now">${esc(first.chord)}</div><div class="next"><span>next</span><b data-r="next">${esc(second.chord)}</b></div></div>`}
    <div class="beats" data-r="beats"><i></i><i></i><i></i><i></i></div>
    ${o.pickPattern ? `<div class="pattern-pick" data-r="pick">${Object.entries(C.PATTERNS).map(([k, p]) => `<button class="pill ${k === o.pattern ? 'active' : ''}" data-a="pattern" data-p="${k}">${esc(p.name)}</button>`).join('')}</div>` : ''}
    <div class="pattern" data-r="pattern">${patternSlots(o.pattern)}</div>
    <div class="groove-ctl">
      <button class="pill" data-a="bpm" data-d="-5" aria-label="slower">−5</button>
      <div class="bpm"><b data-r="bpm">${o.bpm}</b><small>bpm</small></div>
      <button class="pill" data-a="bpm" data-d="5" aria-label="faster">+5</button>
    </div>
    <button class="big" data-a="toggle">Start</button>
    ${o.song ? `<button class="ghost" data-a="logtempo">That tempo felt clean. Log it.</button>` : ''}
    <p class="hint" data-r="hint">${esc(pat.hint)}</p>
  </div>`;
}
function mountGroove(id, o) {
  const el = document.getElementById(id); if (!el) return;
  let bpm = o.bpm, pattern = o.pattern;
  const bars = o.bars, COUNTIN = o.plain ? 0 : 1;
  const r = n => el.querySelector(`[data-r="${n}"]`);
  const beats = [...r('beats').children];
  function tick(e) {
    const bar = Math.floor(e / 8), slot = e % 8;
    const slots = [...r('pattern').children];
    beats.forEach((b, i) => b.classList.toggle('on', i === (slot >> 1)));
    slots.forEach((s, i) => s.classList.toggle('lit', i === slot));
    if (o.plain) return;
    if (bar < COUNTIN) {
      if (slot === 0) { r('section').textContent = 'Count in'; r('now').classList.add('countin'); r('next').textContent = bars[0].chord; r('bar').textContent = ''; }
      if (slot % 2 === 0) r('now').textContent = String(slot / 2 + 1);
      return;
    }
    const bi = (bar - COUNTIN) % bars.length, b = bars[bi], nx = bars[(bi + 1) % bars.length];
    if (slot === 0) {
      r('now').classList.remove('countin'); r('now').textContent = b.chord; r('next').textContent = nx.chord;
      r('section').textContent = b.section || o.label || ''; r('bar').textContent = `bar ${bi + 1} of ${bars.length}`;
    }
    el.classList.toggle('change-soon', slot >= 6 && nx.chord !== b.chord);
  }
  el.addEventListener('click', ev => {
    const a = ev.target.closest('[data-a]'); if (!a) return;
    const act = a.dataset.a;
    if (act === 'bpm') { bpm = Math.min(240, Math.max(30, bpm + Number(a.dataset.d))); r('bpm').textContent = bpm; if (Metro.owner === id) Metro.setBpm(bpm); }
    if (act === 'pattern') { pattern = a.dataset.p; [...r('pick').children].forEach(x => x.classList.toggle('active', x.dataset.p === pattern)); r('pattern').innerHTML = patternSlots(pattern); r('hint').textContent = C.PATTERNS[pattern].hint; }
    if (act === 'toggle') {
      if (Metro.running && Metro.owner === id) { Metro.stop(); a.textContent = 'Start'; el.classList.remove('running', 'change-soon'); beats.forEach(b => b.classList.remove('on')); }
      else { Metro.start(bpm, id); Metro.onTick = tick; a.textContent = 'Stop'; el.classList.add('running'); if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); }
    }
    if (act === 'logtempo') logTempo(o.song, bpm);
  });
}
async function logTempo(song, bpm) {
  try { setData(await api('POST', '/metric', { type: 'tempo', song, bpm, date: localDate() })); toast(`Logged ${bpm} bpm for ${C.SONGS[song].title}`); announceBadges(); }
  catch (e) { toast('Could not save: ' + e.message); }
}
function bestTempo(song) { return S.data.metrics.tempo.filter(m => m.song === song).reduce((a, m) => Math.max(a, m.bpm), 0); }

// ---------- one-minute changes ----------
const samePair = (a, b) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
function pairHistory(pair) { return S.data.metrics.changes.filter(m => samePair(m.pair, pair)); }
function personalBest(pair) { return pairHistory(pair).reduce((a, m) => (!a || m.count > a.count ? m : a), null); }
function changesHTML(id, pair, rounds = 1) {
  const pb = personalBest(pair);
  return `<div class="changes" id="${id}">
    <div class="pair">${chordSVG(pair[0], 'sm')}<span class="arrows">⇄</span>${chordSVG(pair[1], 'sm')}</div>
    <div class="ch-time" data-r="time"><b>60</b> seconds${rounds > 1 ? ` · ${rounds} rounds` : ''}</div>
    <button class="tap" data-a="tap"><b data-r="count">0</b><small data-r="label">Press Start, then tap here every time you land the new chord cleanly</small></button>
    <button class="big" data-a="start">Start 60 seconds</button>
    <div class="ch-result" data-r="result">${pb ? `Personal best: <b>${pb.count}</b> on ${fmtDate(pb.date)}` : 'No baseline yet. The first number is the easiest one to beat.'}</div>
  </div>`;
}
function mountChanges(id, pair) {
  const el = document.getElementById(id); if (!el) return;
  const r = n => el.querySelector(`[data-r="${n}"]`);
  let running = false, count = 0, left = 60, timer = null;
  const startBtn = el.querySelector('[data-a="start"]');
  async function finish() {
    clearInterval(timer); running = false; el.classList.remove('running'); Snd.chime();
    startBtn.disabled = false; startBtn.textContent = 'Go again';
    r('label').textContent = 'Time. Shake out your hand.';
    const prev = personalBest(pair), prevCount = prev ? prev.count : 0;
    try {
      setData(await api('POST', '/metric', { type: 'changes', pair, count, date: localDate() }));
      r('result').innerHTML = count > prevCount
        ? `<b>${count}</b> changes. <span class="pbtag">New personal best${prevCount ? ` (was ${prevCount})` : ''}.</span>`
        : `<b>${count}</b> changes. Your best is ${prevCount}.`;
      announceBadges();
    } catch (e) { r('result').textContent = 'Not saved: ' + e.message; }
  }
  el.addEventListener('click', ev => {
    const a = ev.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'start' && !running) {
      Snd.ensure(); count = 0; left = 60; running = true; r('count').textContent = '0'; r('time').innerHTML = `<b>${left}</b> seconds`;
      r('label').textContent = 'Tap on every clean change'; startBtn.disabled = true; el.classList.add('running');
      timer = setInterval(() => { left--; r('time').innerHTML = `<b>${left}</b> seconds`; if (left <= 10 && left > 0) Snd.blip(Snd.ctx.currentTime, 660, 0.15); if (left <= 0) finish(); }, 1000);
    }
    if (a.dataset.a === 'tap' && running) { count++; r('count').textContent = count; el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 110); }
  });
}

// ---------- practice runner ----------
const P = { active: false };
function startPractice(day, short, replay) {
  const p = plan(day);
  const blocks = short ? C.shortBlocks(p.blocks) : p.blocks;
  clearInterval(P.clock);
  Object.assign(P, { active: true, plan: p, blocks, i: 0, short: !!short, replay: !!replay, startedAt: Date.now(), phase: 'blocks', mood: 0, win: '', remaining: 0, timer: null, clock: null, result: null, timeUp: false });
  P.clock = setInterval(paintClock, 1000);
  enterBlock(); location.hash = '#practice';
}
// Real time spent in this session, wall clock, independent of the block countdowns.
const elapsedSec = () => Math.max(0, Math.round((Date.now() - P.startedAt) / 1000));
const fmtClock = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const todayLogged = () => (S.data ? S.data.stats.todaySessions.reduce((a, x) => a + (Number(x.minutes) || 0), 0) : 0);
function paintClock() {
  const t = $('#pclock'); if (!t) return;
  const sec = elapsedSec(), before = todayLogged();
  t.textContent = fmtClock(sec);
  const tot = $('#ptoday'); if (tot) tot.textContent = before ? `${before + Math.floor(sec / 60)} min today` : '';
}
function sessionBar(right) {
  const before = todayLogged();
  return `<div class="p-clockrow"><span class="num" id="pclock">${fmtClock(elapsedSec())}</span><span>this session</span>${before ? `<span class="dot">·</span><span id="ptoday">${before + Math.floor(elapsedSec() / 60)} min today</span>` : '<span id="ptoday"></span>'}${right || ''}</div>`;
}
function enterBlock() {
  clearInterval(P.timer);
  P.remaining = Math.round(P.blocks[P.i].minutes * 60); P.timeUp = false;
  P.timer = setInterval(() => {
    P.remaining--;
    if (P.remaining === 0) { P.timeUp = true; Snd.chime(); const nb = $('[data-a="next"]'); if (nb) nb.classList.add('timeup'); }
    const t = $('#ptimer'); if (t) paintTimer(t);
  }, 1000);
}
function paintTimer(t) {
  const s = Math.abs(P.remaining); t.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; t.classList.toggle('over', P.remaining < 0);
}
function nextBlock() {
  Metro.stop();
  P.i++;
  if (P.i >= P.blocks.length) { clearInterval(P.timer); P.phase = 'log'; }
  else enterBlock();
  render();
}
function exitPractice() {
  if (P.phase === 'blocks' && !confirm('Leave this session? Nothing will be logged.')) return;
  Metro.stop(); clearInterval(P.timer); clearInterval(P.clock); P.active = false; location.hash = '#today';
}
async function finishSession() {
  const seconds = Math.max(1, elapsedSec()), minutes = Math.max(1, Math.round(seconds / 60));
  const btn = $('[data-a="finish"]'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const d = await api('POST', '/session', { date: localDate(), day: P.plan.day, minutes, seconds, mood: P.mood || 3, win: P.win.trim(), short: P.short, replay: P.replay, blocks: P.blocks.length });
    clearInterval(P.clock);
    setData(d); P.phase = 'done'; P.result = { minutes, seconds, today: todayLogged() }; render(); confetti();
  } catch (e) { toast('Could not save: ' + e.message); if (btn) { btn.disabled = false; btn.textContent = 'Finish'; } }
}
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#f0a33a', '#d4683b', '#8bc48a', '#f3e9d8', '#6fb3d6'];
  for (let i = 0; i < 48; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + 'vw'; p.style.background = colors[i % colors.length]; p.style.animationDelay = Math.random() * .8 + 's'; p.style.animationDuration = 2 + Math.random() * 1.4 + 's'; box.appendChild(p); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4000);
}
function announceBadges() {
  if (!S.newBadges || !S.newBadges.length) return;
  const defs = S.data.badgeDefs; const names = S.newBadges.map(id => (defs.find(b => b.id === id) || {}).name).filter(Boolean);
  if (names.length && P.phase !== 'done') { toast(`Badge earned: ${names.join(', ')}`); S.newBadges = null; }
}

function viewPractice() {
  if (!P.active) return '';
  if (P.phase === 'log') return viewLog();
  if (P.phase === 'done') return viewDone();
  const b = P.blocks[P.i], n = P.blocks.length;
  const toolId = `tool-${P.i}`;
  let tool = '';
  if (b.type === 'chord') tool = chordCards(b.chords);
  if (b.type === 'changes') tool = changesHTML(toolId, b.pair, b.rounds);
  if (b.type === 'metronome') tool = chordCards(b.chords, false) + grooveHTML(toolId, { bpm: b.bpm, pattern: b.pattern, bars: buildBars(b), label: C.PATTERNS[b.pattern].name });
  if (b.type === 'playalong') tool = grooveHTML(toolId, { bpm: b.bpm, pattern: b.pattern, bars: buildBars(b), label: C.SONGS[b.song].title, song: b.song });
  return `<section class="practice">
    <header class="p-head"><div class="p-headrow"><button class="icon" data-a="exit" aria-label="leave session">✕</button>
      <div class="segs">${P.blocks.map((_, j) => `<i class="${j < P.i ? 'done' : j === P.i ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="p-timer num" id="ptimer">${pad(Math.floor(P.remaining / 60))}:${pad(P.remaining % 60)}</div></div>
      ${sessionBar(`<span class="right">block ${P.i + 1}/${n} · ${b.minutes} min</span>`)}</header>
    <h2 class="p-title">${BLOCK_ICON[b.type] || ''} ${esc(b.title)}</h2>
    <p class="p-sub">Block ${P.i + 1} of ${n} · ${b.minutes} min · Day ${P.plan.day}${P.short ? ' · quick version' : ''}${P.replay ? ' · replay' : ''}</p>
    <ul class="lines">${(b.lines || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    ${tool}
    <footer class="p-foot"><button class="ghost" data-a="skip">Skip</button><button class="primary" data-a="next">${P.i === n - 1 ? 'Finish & log' : 'Next block →'}</button></footer>
  </section>`;
}
function mountPractice() {
  if (!P.active || P.phase !== 'blocks') return;
  const b = P.blocks[P.i], toolId = `tool-${P.i}`;
  if (b.type === 'changes') mountChanges(toolId, b.pair);
  if (b.type === 'metronome') mountGroove(toolId, { bpm: b.bpm, pattern: b.pattern, bars: buildBars(b), label: C.PATTERNS[b.pattern].name });
  if (b.type === 'playalong') mountGroove(toolId, { bpm: b.bpm, pattern: b.pattern, bars: buildBars(b), label: C.SONGS[b.song].title, song: b.song });
  const t = $('#ptimer'); if (t) paintTimer(t);
  paintClock();
  if (P.timeUp) { const nb = $('[data-a="next"]'); if (nb) nb.classList.add('timeup'); }
}
function viewLog() {
  return `<section class="practice log">
    <header class="p-head"><div class="p-headrow"><button class="icon" data-a="exit" aria-label="leave">✕</button><div class="segs">${P.blocks.map(() => '<i class="done"></i>').join('')}</div><div class="p-timer num">✓</div></div>
      ${sessionBar('<span class="right">still counting</span>')}</header>
    <h2 class="p-title">How did that feel?</h2>
    <p class="p-sub">Day ${P.plan.day} · ${esc(P.plan.title)}</p>
    <div class="moods">${MOODS.map((m, i) => `<button data-a="mood" data-m="${i + 1}" class="${P.mood === i + 1 ? 'active' : ''}" aria-label="${MOOD_WORDS[i]}">${m}</button>`).join('')}</div>
    <div class="card"><h3>One small win today</h3>
      <input type="text" id="win" maxlength="140" placeholder="e.g. Em rang clean three times in a row" value="${esc(P.win)}" autocomplete="off"></div>
    <button class="primary xl" data-a="finish">Finish</button>
  </section>`;
}
function viewDone() {
  const st = S.data.stats, defs = S.data.badgeDefs, fresh = S.newBadges || [];
  const next = plan(S.data.progress.currentDay);
  return `<section class="celebrate">
    <div class="sub">Day ${P.plan.day} ${P.replay ? 'replayed' : 'done'}</div>
    <div class="bigday">🔥 ${st.streak}</div>
    <div class="sub">${st.streak === 1 ? 'day streak. Every streak starts at one.' : 'day streak' + (st.streak === st.bestStreak && st.streak > 1 ? '. Your best ever.' : '.')}</div>
    <div class="stats"><div><b class="num">${fmtClock(P.result.seconds)}</b><small>this session</small></div><div><b class="num">${P.result.today}</b><small>min today${st.todaySessions.length > 1 ? ` · ${st.todaySessions.length} sessions` : ''}</small></div><div><b class="num">${Math.round(st.totalMinutes / 60 * 10) / 10}</b><small>hours total</small></div></div>
    ${fresh.length ? `<div class="stack" style="margin-bottom:16px">${fresh.map(id => { const b = defs.find(x => x.id === id); return b ? `<div class="badge"><div class="bi">${BADGE_ICON[id] || '🏅'}</div><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div></div>` : ''; }).join('')}</div>` : ''}
    <p class="quote">“${esc(next.encouragement)}”</p>
    <p class="muted">${P.replay ? `Replays count as practice but never move the program. Your next lesson is still Day ${next.day}, ${esc(next.title)}.` : `Tomorrow: Day ${next.day}, ${esc(next.title)}.`}</p>
    <button class="primary" data-a="home">Back to today</button>
  </section>`;
}

// ---------- today ----------
function ring(done, total) {
  const r = 34, c = 2 * Math.PI * r, f = Math.min(1, done / total);
  return `<svg class="ring" viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="${r}"/><circle class="fill" cx="42" cy="42" r="${r}" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/><text x="42" y="46">${done}</text><text class="lbl" x="42" y="60">of ${total}</text></svg>`;
}
function viewToday() {
  const d = S.data, st = d.stats, n = d.progress.currentDay, plan = C.buildDay(n, { homework: homework() });
  const h = new Date().getHours(), greet = h < 5 ? 'Night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const done = st.practicedToday, last = st.todaySessions[st.todaySessions.length - 1];
  const gap = st.daysSinceLast, mins = C.totalMinutes(plan.blocks);
  const hours = Math.round(st.totalMinutes / 60 * 10) / 10;
  const nextMs = C.MILESTONES.find(m => m.week >= plan.week) || C.MILESTONES[C.MILESTONES.length - 1];
  return `<section class="today">
    <header class="top"><div><div class="greet">${greet}${d.profile.name ? ', ' + esc(d.profile.name) : ''}</div><div class="date">${fmtLong(new Date())}</div></div><a class="icon" href="#settings" aria-label="settings">⚙️</a></header>
    <div class="streak-row">
      <div class="streak ${st.streak ? 'hot' : ''}"><span class="flame">🔥</span><div><b class="num">${st.streak}</b><small>day streak${st.bestStreak > st.streak ? ` · best ${st.bestStreak}` : ''}</small></div></div>
      <div class="stat"><b class="num">${st.totalSessions}</b><small>sessions</small></div>
      <div class="stat"><b class="num">${hours}</b><small>hours played</small></div>
    </div>
    ${gap >= 2 && !done ? `<div class="banner">Welcome back. ${gap} days away reset the streak, not the progress. Day ${n} is right where you left it.</div>` : ''}
    ${done ? `<div class="card hero donecard">
        <div class="eyebrow">Day ${last.day} · done ✓</div>
        <div class="row" style="margin-top:6px"><span class="mood">${MOODS[(last.mood || 3) - 1]}</span><div><div class="win">${last.win ? '“' + esc(last.win) + '”' : 'Showed up. That is the habit.'}</div><small>${todayLogged()} minute${todayLogged() === 1 ? '' : 's'} today${st.todaySessions.length > 1 ? ` across ${st.todaySessions.length} sessions` : ''}${last.short ? ', quick version' : ''}</small></div></div>
        <p style="margin:12px 0 0">See you tomorrow for Day ${n}. Streak safe.</p>
      </div>` :
      `<div class="card hero daycard"><div class="row spread"><div>
        <div class="eyebrow">${plan.beyond ? 'Beyond the program' : `Week ${plan.week} of 12 · ${esc(plan.phase)}`}</div>
        <div class="title">Day ${n}${plan.beyond ? '' : ` · ${esc(plan.title)}`}</div>
        <div class="goal">${esc(plan.goal)}</div></div>${plan.beyond ? '' : ring(n - 1, d.totalDays)}</div>
        <button class="primary xl" data-a="start" style="margin-top:16px">Start · ${mins} minutes</button>
        <button class="ghost" data-a="short">Only have 5 minutes?</button></div>`}
    <div class="card"><h3>${done ? `Up next · Day ${n}, ${esc(plan.title)}` : plan.isReview ? 'Review day' : "Today's plan"}</h3>
      <ol class="blocks">${plan.blocks.map(b => `<li><span>${BLOCK_ICON[b.type] || ''} ${esc(b.title)}</span><span class="bm">${b.minutes} min</span></li>`).join('')}</ol>
      ${done ? `<button class="ghost" data-a="start">Feeling it? Do Day ${n} now</button>` : ''}
      <a class="ghost" href="#lessons" style="text-align:center">Browse or replay any lesson</a></div>
    ${homework().chords.length ? `<div class="card"><h3>Instructor homework</h3><p style="margin-top:0">${homework().chords.map(c => `<span class="chip">${esc(c)}</span>`).join(' ')}</p><p class="muted" style="font-size:14px;margin:8px 0 0">Folded into every session as a ${homework().minutes}-minute block. Edit the list under Settings.</p></div>` : ''}
    <div class="card"><h3>Why this week</h3><p>${esc(plan.why)}</p></div>
    <div class="card"><h3>Milestones</h3>${C.MILESTONES.map(m => `<div class="milestone ${m.week < plan.week ? 'done' : m === nextMs ? 'next' : ''}"><span class="dot"></span><span>${esc(m.label)}</span><small>wk ${m.week}</small></div>`).join('')}</div>
    <p class="quote">“${esc(plan.encouragement)}”</p>
  </section>`;
}

// ---------- songs ----------
function viewSongs() {
  return `<section><h1 style="margin-bottom:12px">Songs</h1>
    ${Object.values(C.SONGS).map((s, i) => { const bt = bestTempo(s.id); return `<a class="card songcard" href="#song/${s.id}">
      <small>Song ${i + 1} · ${esc(s.when)}</small>
      <div class="t">${esc(s.title)}</div><div class="a">${esc(s.artist)}, ${s.year}</div>
      <div class="chips">${s.chords.map(c => `<span class="chip">${esc(c)}</span>`).join('')}<span class="chip acc">${esc(C.PATTERNS[s.pattern].name)}</span></div>
      <p class="muted" style="margin:10px 0 0">${bt ? `Your clean tempo: <b>${bt}</b> of ${s.bpm} bpm` : `Target ${s.bpm} bpm. No tempo logged yet.`}</p></a>`; }).join('')}
    <div class="card"><h3>Chord library</h3>${chordCards(Object.keys(C.CHORDS), false)}
      ${Object.keys(C.CHORDS).map(n => `<p class="chord-tip"><b>${esc(n)}</b> · ${esc(C.CHORDS[n].tip)}</p>`).join('')}</div>
  </section>`;
}
function songGrooveOpts(id) {
  const s = C.SONGS[id], bt = bestTempo(id);
  return { bpm: Math.max(40, bt || Math.round(s.bpm * 0.6)), pattern: s.pattern, bars: buildBars({ type: 'playalong', song: id, sections: 'all' }), label: s.title, song: id };
}
function viewSong(id) {
  const s = C.SONGS[id]; if (!s) return '<p>No such song.</p>';
  const bt = bestTempo(id);
  const cls = {}; s.chords.forEach((c, i) => (cls[c] = `c${(i % 3) + 1}`));
  return `<section><a class="back" href="#songs">← Songs</a>
    <h1>${esc(s.title)}</h1><p class="muted" style="margin-top:2px">${esc(s.artist)}, ${s.year} · ${s.bpm} bpm · ${esc(C.PATTERNS[s.pattern].name)}</p>
    <div class="card"><h3>Chords</h3>${chordCards(s.chords)}</div>
    <div class="card"><h3>Play-along</h3><p class="muted" style="margin-top:0">${bt ? `Your best clean tempo is ${bt} bpm. Starting there.` : 'Starting slow. Add 5 bpm each time a run feels clean, and log it.'}</p>
      ${grooveHTML('song-groove', songGrooveOpts(id))}</div>
    <div class="card"><h3>Structure</h3><div class="structure">${s.sections.map(sec => `<div class="sec"><div class="sn">${esc(sec.name)}</div><div class="bars8">${sec.bars.map(b => `<span class="${cls[b]}">${esc(b)}</span>`).join('')}</div></div>`).join('')}</div>
      <p class="muted" style="font-size:14px">One box is one bar: one full strumming pattern.</p></div>
    <div class="card"><h3>Notes</h3><ul class="lines">${s.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
  </section>`;
}

// ---------- lessons (browse and replay any day) ----------
function viewLessons() {
  const d = S.data, cur = d.progress.currentDay, doneDays = new Set(d.sessions.map(s => s.day));
  let html = `<section><h1 style="margin-bottom:4px">Lessons</h1><p class="muted" style="margin-top:0">Every day of the program. Replay anything; replays count as practice but never move you forward.</p>`;
  C.WEEKS.forEach((w, wi) => {
    html += `<div class="card"><h3>Week ${wi + 1} · ${esc(w.title)}</h3><p class="muted" style="margin:0 0 8px;font-size:14px">${esc(w.goal)}</p><ol class="blocks">`;
    for (let i = 1; i <= 7; i++) {
      const n = wi * 7 + i, p = plan(n);
      const main = p.blocks.find(b => ['playalong', 'changes', 'metronome', 'chord'].includes(b.type)) || p.blocks[0];
      const tag = n === cur ? 'next' : doneDays.has(n) ? 'done' : n < cur ? 'skipped' : '';
      html += `<li><a href="#lesson/${n}" style="display:flex;justify-content:space-between;width:100%;color:inherit"><span>${tag === 'done' ? '✅' : tag === 'next' ? '👉' : tag === 'skipped' ? '◻️' : '▫️'} Day ${n}${i === 7 ? ' · review' : ''} <small>${esc(main.title)}</small></span><span class="bm">${C.totalMinutes(p.blocks)} min</span></a></li>`;
    }
    html += `</ol></div>`;
  });
  if (cur > C.TOTAL_DAYS) html += `<div class="card"><h3>Beyond</h3><p class="muted" style="margin-top:0">You are past day 84. Today's maintenance day is on the Today tab.</p></div>`;
  return html + `</section>`;
}
function viewLesson(nStr) {
  const n = Number(nStr); if (!n || n < 1) return '<p>No such lesson.</p>';
  const d = S.data, cur = d.progress.currentDay, p = plan(n);
  const done = d.sessions.filter(s => s.day === n);
  const isNext = n === cur, past = n < cur;
  return `<section><a class="back" href="#lessons">← Lessons</a>
    <small>${p.beyond ? 'Beyond the program' : `Week ${p.week} · Day ${p.dayInWeek} of 7`}</small>
    <h1>Day ${n} · ${esc(p.title)}</h1>
    <p class="muted" style="margin-top:2px">${esc(p.goal)}</p>
    ${done.length ? `<div class="banner">Done ${done.map(s => fmtDate(s.date)).join(', ')}${done[done.length - 1].win ? ` · “${esc(done[done.length - 1].win)}”` : ''}</div>` : ''}
    ${p.blocks.map(b => `<div class="card"><h3>${BLOCK_ICON[b.type] || ''} ${esc(b.title)} · ${b.minutes} min</h3>
      <ul class="lines">${(b.lines || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      ${b.chords ? chordCards(b.chords, false) : ''}${b.pair ? chordCards(b.pair, false) : ''}
      ${b.bpm ? `<small>${b.bpm} bpm · ${esc(C.PATTERNS[b.pattern].name)}${b.song ? ' · ' + esc(C.SONGS[b.song].title) : ''}</small>` : ''}</div>`).join('')}
    <div class="card"><p class="muted" style="margin-top:0">${isNext ? 'This is your next lesson. Starting it here counts the same as from Today.' : past ? 'A replay. It counts as practice but your next lesson stays Day ' + cur + '.' : 'This lesson is ahead of you. Previewing it as a replay will not skip the days in between.'}</p>
      <button class="primary" data-a="lesson" data-n="${n}">${isNext ? `Start Day ${n}` : `Replay Day ${n}`}</button>
      <button class="ghost" data-a="lesson-short" data-n="${n}">Quick 5-minute version</button></div>
  </section>`;
}

// ---------- progress ----------
function viewProgress() {
  const d = S.data, st = d.stats, total = d.totalDays, cur = d.progress.currentDay;
  const doneDays = new Set(d.sessions.map(s => s.day));
  let grid = '';
  for (let w = 0; w < 12; w++) {
    grid += `<div class="wl">W${w + 1}</div>`;
    for (let i = 1; i <= 7; i++) { const n = w * 7 + i; grid += `<div class="d ${doneDays.has(n) ? 'done' : ''} ${n === cur ? 'today' : ''} ${i === 7 ? 'review' : ''}">${n}</div>`; }
  }
  const pairs = []; d.metrics.changes.forEach(m => { if (!pairs.some(p => samePair(p, m.pair))) pairs.push(m.pair); });
  const changesCards = pairs.map(p => { const hist = pairHistory(p).slice(-14); const max = Math.max(...hist.map(h => h.count), 1); const pb = personalBest(p);
    return `<div class="card"><h3>${esc(p[0])} ⇄ ${esc(p[1])} · best ${pb.count}</h3><div class="bars">${hist.map(h => `<i style="height:${Math.max(4, h.count / max * 100)}%"><span>${h.count}</span></i>`).join('')}</div><small>${hist.length} round${hist.length === 1 ? '' : 's'}, oldest to newest</small></div>`; }).join('');
  const tempoRows = Object.values(C.SONGS).map(s => { const bt = bestTempo(s.id); return `<div class="kv"><span>${esc(s.title)}</span><span><b class="num">${bt || '–'}</b> <small>/ ${s.bpm} bpm</small></span></div>`; }).join('');
  const byDate = {}; d.sessions.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + (Number(s.minutes) || 0); });
  const days14 = Array.from({ length: 14 }, (_, i) => { const dt = new Date(); dt.setDate(dt.getDate() - (13 - i)); const k = localDate(dt); return { k, m: byDate[k] || 0 }; });
  const maxM = Math.max(15, ...days14.map(x => x.m)), avg = Math.round(days14.reduce((a, x) => a + x.m, 0) / 14);
  const minutesCard = `<div class="card"><h3>Minutes per day · last two weeks</h3><div class="bars">${days14.map(x => `<i class="${x.m ? '' : 'empty'}" style="height:${Math.max(4, x.m / maxM * 100)}%"><span>${x.m || ''}</span></i>`).join('')}</div><small>Real time, from the session clock. Average ${avg} min a day, target 15. Today is the last bar.</small></div>`;
  const earned = new Map(d.badges.map(b => [b.id, b.date]));
  const badges = d.badgeDefs.map(b => `<div class="badge ${earned.has(b.id) ? '' : 'locked'}"><div class="bi">${BADGE_ICON[b.id] || '🏅'}</div><div><b>${esc(b.name)}</b><small>${earned.has(b.id) ? 'Earned ' + fmtDate(earned.get(b.id)) : esc(b.desc)}</small></div></div>`).join('');
  const recent = d.sessions.slice(-7).reverse();
  return `<section><h1 style="margin-bottom:12px">Progress</h1>
    <div class="streak-row">
      <div class="streak ${st.streak ? 'hot' : ''}"><span class="flame">🔥</span><div><b class="num">${st.streak}</b><small>streak · best ${st.bestStreak}</small></div></div>
      <div class="stat"><b class="num">${Math.min(cur - 1, total)}</b><small>of ${total} days</small></div>
      <div class="stat"><b class="num">${Math.round(st.totalMinutes / 60 * 10) / 10}</b><small>hours</small></div></div>
    <div class="card"><h3>The 84 days</h3><div class="grid84">${grid}</div><small style="display:block;margin-top:8px">Dashed boxes are review days. The outlined box is next.</small></div>
    ${minutesCard}
    <div class="card"><h3>Clean tempo</h3>${tempoRows}<small>Log a tempo from any play-along when a full run sounds clean.</small></div>
    ${changesCards || '<div class="card"><h3>Chord changes</h3><p class="muted">Your one-minute change counts will chart here from week 2.</p></div>'}
    <div class="card"><h3>Badges</h3><div class="badges">${badges}</div></div>
    ${recent.length ? `<div class="card"><h3>Recent sessions</h3>${recent.map(s => `<div class="kv"><span>${MOODS[(s.mood || 3) - 1]} Day ${s.day} <small>${fmtDate(s.date)} · ${s.minutes} min</small></span><span class="muted" style="text-align:right;max-width:55%;font-size:14px">${esc(s.win || '')}</span></div>`).join('')}</div>` : ''}
  </section>`;
}

// ---------- tools ----------
const TUNING = [['E', 82.41, '6th'], ['A', 110.0, '5th'], ['D', 146.83, '4th'], ['G', 196.0, '3rd'], ['B', 246.94, '2nd'], ['e', 329.63, '1st']];
const PAIRS = [['Em', 'D6/9'], ['G', 'D'], ['D', 'Am'], ['D', 'C'], ['Am', 'C'], ['G', 'C'], ['G', 'Em'], ['A', 'D'], ['D', 'E'], ['A', 'E']];
const TOOL_METRO = { bpm: 80, pattern: 'd_du_udu', bars: [{ chord: '' }], label: 'Metronome', plain: true, pickPattern: true };
function toolPairs() {
  const hw = homework().chords.filter(c => C.CHORDS[c]), out = [];
  for (let i = 0; i < hw.length - 1; i++) out.push([hw[i], hw[i + 1]]);
  if (hw.length > 2) out.push([hw[hw.length - 1], hw[0]]);
  PAIRS.forEach(p => { if (!out.some(q => samePair(p, q))) out.push(p); });
  return out;
}
function viewTools() {
  const pairs = toolPairs(), pair = S.toolPair || pairs[0];
  return `<section><h1 style="margin-bottom:12px">Tools</h1>
    <div class="card"><h3>Reference tones</h3><p class="muted" style="margin-top:0">Tap a string and tune yours to match. Low E on the left.</p>
      <div class="tuner">${TUNING.map(([n, f, pos]) => `<button data-a="tone" data-f="${f}">${n}<small>${pos}</small></button>`).join('')}</div></div>
    <div class="card"><h3>Metronome</h3>${grooveHTML('tool-metro', TOOL_METRO)}</div>
    <div class="card"><h3>One-minute changes</h3>
      ${homework().chords.length ? `<p class="muted" style="margin-top:0;font-size:14px">Your instructor's pairs come first.</p>` : ''}
      <div class="pattern-pick">${pairs.map(p => `<button class="pill ${samePair(p, pair) ? 'active' : ''}" data-a="pair" data-p="${p.join('|')}">${esc(p[0])} ⇄ ${esc(p[1])}</button>`).join('')}</div>
      ${changesHTML('tool-changes', pair)}</div>
  </section>`;
}
function mountTools() { mountGroove('tool-metro', TOOL_METRO); mountChanges('tool-changes', S.toolPair || toolPairs()[0]); }

// ---------- settings ----------
function viewSettings() {
  const d = S.data;
  return `<section><a class="back" href="#today">← Today</a><h1 style="margin-bottom:12px">Settings</h1>
    <div class="card"><h3>Your name</h3><input type="text" id="name" value="${esc(d.profile.name)}" placeholder="What should the app call you?" maxlength="40"><button class="ghost" data-a="save-name">Save</button></div>
    <div class="card"><h3>Current day</h3><p class="muted" style="margin-top:0">The next session is Day ${d.progress.currentDay}. Move it to repeat a week or skip ahead.</p>
      <input type="number" id="curday" min="1" max="999" value="${d.progress.currentDay}"><button class="ghost" data-a="save-day">Set day</button></div>
    <div class="card"><h3>Instructor homework</h3><p class="muted" style="margin-top:0">Chords your teacher has you working on, separated by commas. The app adds a short homework block to every session: shapes on odd days, one-minute changes on even days. Leave empty to turn it off.</p>
      <input type="text" id="hw-chords" value="${esc(d.profile.homework.chords.join(', '))}" placeholder="A, D, E, G, C" autocomplete="off" autocapitalize="characters">
      <small style="display:block;margin:6px 0 10px">Known shapes: ${Object.keys(C.CHORDS).join(', ')}</small>
      <div class="row"><span class="muted" style="font-size:14px">Block length</span>${[2, 3, 5].map(m => `<button class="pill ${d.profile.homework.minutes === m ? 'active' : ''}" data-a="hw-min" data-m="${m}">${m} min</button>`).join('')}</div>
      <button class="ghost" data-a="save-hw">Save homework</button></div>
    <div class="card"><h3>Your data</h3><p class="muted" style="margin-top:0">Everything lives in one JSON file on the Mac Mini. Export it any time.</p>
      <a class="ghost" href="/api/export" download style="text-align:center">Export JSON</a>
      <button class="ghost danger" data-a="reset">Reset all progress</button></div>
    <div class="card"><h3>About</h3><p class="muted" style="margin-top:0">Twelve weeks, fifteen minutes a day. Song 1 is A Horse with No Name (Em, D6/9). Song 2 is Knockin' on Heaven's Door (G, D, Am, C). Edit public/curriculum.js on the Mac Mini to change anything.</p>
      <p class="muted">Tip: on iPhone, open this page in Safari, tap Share, then Add to Home Screen.</p></div>
  </section>`;
}

// ---------- router ----------
function parseHash() { const h = location.hash.replace(/^#/, '') || 'today'; const [route, param] = h.split('/'); return { route, param }; }
function render() {
  const { route, param } = parseHash(); S.route = route; S.param = param;
  const app = $('#app'), tabs = $('#tabs');
  if (route === 'practice' && !P.active) { location.replace('#today'); return; }
  if (route !== 'practice') { Metro.stop(); if (P.active && P.phase !== 'done') { clearInterval(P.timer); P.active = false; } }
  let html = '';
  switch (route) {
    case 'practice': html = viewPractice(); break;
    case 'songs': html = viewSongs(); break;
    case 'lessons': html = viewLessons(); break;
    case 'lesson': html = viewLesson(param); break;
    case 'song': html = viewSong(param); break;
    case 'progress': html = viewProgress(); break;
    case 'tools': html = viewTools(); break;
    case 'settings': html = viewSettings(); break;
    default: html = viewToday();
  }
  app.innerHTML = html;
  const hideTabs = route === 'practice';
  tabs.hidden = hideTabs; app.classList.toggle('no-tabs', hideTabs);
  [...tabs.querySelectorAll('a')].forEach(a => a.classList.toggle('active', a.dataset.tab === route || (route === 'song' && a.dataset.tab === 'songs') || (route === 'lesson' && a.dataset.tab === 'lessons')));
  if (route === 'practice') mountPractice();
  if (route === 'song') mountGroove('song-groove', songGrooveOpts(param));
  if (route === 'tools') mountTools();
  window.scrollTo(0, 0);
}

document.addEventListener('click', async ev => {
  const a = ev.target.closest('#app [data-a]'); if (!a || a.closest('.groove, .changes')) return; // tools handle their own clicks
  const act = a.dataset.a, d = S.data;
  switch (act) {
    case 'start': Snd.ensure(); startPractice(d.progress.currentDay, false); break;
    case 'short': Snd.ensure(); startPractice(d.progress.currentDay, true); break;
    case 'exit': exitPractice(); break;
    case 'next': case 'skip': nextBlock(); break;
    case 'mood': P.mood = Number(a.dataset.m); [...a.parentElement.children].forEach(b => b.classList.toggle('active', b === a)); break;
    case 'finish': P.win = ($('#win') || {}).value || ''; finishSession(); break;
    case 'home': P.active = false; S.newBadges = null; location.hash = '#today'; break;
    case 'lesson': case 'lesson-short': { const n = Number(a.dataset.n); Snd.ensure(); startPractice(n, act === 'lesson-short', n !== d.progress.currentDay); break; }
    case 'hw-min': [...a.parentElement.querySelectorAll('.pill')].forEach(b => b.classList.toggle('active', b === a)); break;
    case 'save-hw': {
      const raw = $('#hw-chords').value.split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
      const canon = raw.map(x => Object.keys(C.CHORDS).find(k => k.toLowerCase() === x.toLowerCase()) || x);
      const unknown = canon.filter(x => !C.CHORDS[x]);
      if (unknown.length) { toast(`No shape yet for: ${unknown.join(', ')}`); break; }
      const minutes = Number(($('[data-a="hw-min"].active') || {}).dataset?.m || 3);
      try { setData(await api('POST', '/profile', { homework: { chords: canon, minutes } })); toast(canon.length ? `Homework set: ${canon.join(', ')}` : 'Homework turned off'); render(); } catch (e) { toast(e.message); }
      break; }
    case 'tone': Snd.tone(Number(a.dataset.f)); break;
    case 'pair': S.toolPair = a.dataset.p.split('|'); render(); break;
    case 'save-name': try { setData(await api('POST', '/profile', { name: $('#name').value })); toast('Saved'); } catch (e) { toast(e.message); } break;
    case 'save-day': try { setData(await api('POST', '/profile', { currentDay: Number($('#curday').value) })); toast(`Next session is Day ${S.data.progress.currentDay}`); } catch (e) { toast(e.message); } break;
    case 'reset': if (confirm('Reset all progress? A backup copy is kept in the data folder.')) { try { setData(await api('POST', '/reset', { confirm: 'RESET' })); toast('Fresh start. Day 1 awaits.'); render(); } catch (e) { toast(e.message); } } break;
  }
});
document.addEventListener('input', ev => { if (ev.target.id === 'win') P.win = ev.target.value; });
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && S.route !== 'practice') { try { setData(await api('GET', '/state')); render(); } catch {} } });

(async function init() {
  try { setData(await api('GET', '/state')); }
  catch (e) { $('#app').innerHTML = `<div class="loading">Could not reach the server.<br><small>${esc(e.message)}</small></div>`; return; }
  if (location.hash === '#practice') location.replace('#today');
  render();
})();
})();
