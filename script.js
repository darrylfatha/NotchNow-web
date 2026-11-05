'use strict';

// ================= Unduhan =================
const REPO = 'darrylfatha/NotchNow-web';
const ZIP = 'NotchNow-win-x64.zip';
const DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/${ZIP}`;
document.querySelectorAll('[data-download]').forEach((a) => { a.href = DOWNLOAD_URL; });

fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel) return;
    const asset = (rel.assets || []).find((a) => a.name === ZIP);
    const size = asset ? `${Math.round(asset.size / 1048576)} MB` : '';
    const meta = [rel.tag_name, size, 'File .zip · Windows 64-bit'].filter(Boolean).join(' · ');
    document.getElementById('dl-meta').textContent = meta;
    document.getElementById('dl-meta-2').textContent = `${ZIP}${size ? ' · ' + size : ''}`;
    if (size) document.getElementById('req-size').textContent = size;
  })
  .catch(() => { /* tetap pakai teks bawaan */ });

// ================= Util =================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const clock = (ms) => {
  const t = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

// ================= Skala layar demo =================
const screenEl = $('#screen');
const stage = $('#stage');
new ResizeObserver(() => { stage.style.transform = `scale(${screenEl.clientWidth / 960})`; }).observe(screenEl);

// ================= Buka / tutup notch =================
const notch = $('#notch');
const isTouch = matchMedia('(hover: none)').matches;
let open = false;
let hovered = false;
let holdUntil = 0;
let closeT = null;
let ringing = false;

function setOpen(v) {
  open = v;
  notch.classList.toggle('open', v);
  if (v) $('#demo-hint').textContent = 'Coba tab-tabnya: semuanya bisa diklik';
}
function scheduleClose(delay = 450) {
  clearTimeout(closeT);
  closeT = setTimeout(() => {
    if (hovered || ringing || Date.now() < holdUntil) return;
    if (notch.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    setOpen(false);
  }, delay);
}
if (!isTouch) {
  notch.addEventListener('mouseenter', () => { hovered = true; clearTimeout(closeT); setTimeout(() => hovered && setOpen(true), 80); });
  notch.addEventListener('mouseleave', () => { hovered = false; holdUntil = 0; scheduleClose(); });
}
notch.addEventListener('click', () => { if (!open) setOpen(true); });
document.addEventListener('click', (e) => {
  if (open && !notch.contains(e.target) && !e.target.closest('.feature') && !ringing) { holdUntil = 0; setOpen(false); }
});
$('#browser-mode').addEventListener('change', (e) => {
  $('#fake-browser').classList.toggle('on', e.target.checked);
  notch.classList.toggle('compact', e.target.checked);
  $('#demo-hint').textContent = e.target.checked
    ? 'Browser terbuka → notch mengecil jadi label NotchNow. Arahkan kursor ke label untuk membukanya.'
    : '👆 Arahkan kursor (atau ketuk) ke notch di atas layar';
});

// ================= Tab =================
function showTab(name) {
  $$('#n-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.n-main section').forEach((s) => s.classList.toggle('active', s.dataset.tab === name));
  if (name === 'calendar') renderCal();
}
$$('#n-tabs button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); showTab(b.dataset.tab); }));
showTab('media');

// Kartu fitur → buka demo pada tab terkait
$$('.feature[data-go]').forEach((card) => card.addEventListener('click', () => {
  const go = card.dataset.go;
  $('.demo-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const bm = $('#browser-mode');
  if (go === 'browser') {
    if (!bm.checked) bm.click();
    setOpen(false);
    return;
  }
  setTimeout(() => {
    showTab(go);
    holdUntil = Date.now() + 8000;
    setOpen(true);
    scheduleClose(8100);
  }, 350);
}));

// ================= Suara =================
let actx = null;
function beep() {
  try {
    actx = actx || new AudioContext();
    const t = actx.currentTime + 0.02;
    for (let i = 0; i < 4; i++) {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'square';
      o.frequency.value = i % 2 ? 1046 : 880;
      g.gain.setValueAtTime(0.0001, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.08, t + i * 0.18 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.13);
      o.connect(g).connect(actx.destination);
      o.start(t + i * 0.18);
      o.stop(t + i * 0.18 + 0.16);
    }
  } catch { /* audio tidak tersedia */ }
}

// ================= Peringatan =================
let ringT = null;
function ring(title, body) {
  ringing = true;
  $('#a-title').textContent = title;
  $('#a-body').textContent = body;
  $('#n-alert').hidden = false;
  setOpen(true);
  beep();
  ringT = setInterval(beep, 1300);
  setTimeout(stopRing, 20000);
}
function stopRing() {
  if (!ringing) return;
  ringing = false;
  clearInterval(ringT);
  $('#n-alert').hidden = true;
  if (!hovered) scheduleClose(300);
}
$('#a-stop').addEventListener('click', (e) => { e.stopPropagation(); stopRing(); });

// ================= Media (simulasi) =================
const SONGS = [
  { title: 'Senja di Kota', artist: 'Band Demo', dur: 204, art: 'linear-gradient(135deg,#ff7a59,#b33cff 55%,#3a4bff)' },
  { title: 'Hujan Pertama', artist: 'Kilau Biru', dur: 187, art: 'linear-gradient(135deg,#30d158,#0a84ff)' },
  { title: 'Jalan Pulang', artist: 'Orkes Malam', dur: 231, art: 'linear-gradient(135deg,#ffd60a,#ff375f)' },
];
let song = 0;
let pos = 0;
let playing = false;
let vol = 40;
function renderMedia() {
  const s = SONGS[song];
  $('#m-title').textContent = s.title;
  $('#m-artist').textContent = s.artist;
  $('#m-art').style.background = s.art;
  $('#m-art').classList.toggle('playing', playing);
  $('#m-play').textContent = playing ? '⏸' : '▶';
  $('#m-state').textContent = playing ? 'memutar' : 'dijeda';
  $('#m-pos').textContent = mmss(pos);
  $('#m-dur').textContent = mmss(s.dur);
  $('#m-bar').style.width = `${(pos / s.dur) * 100}%`;
  const sl = $('#m-vol');
  sl.value = vol;
  sl.style.setProperty('--p', vol + '%');
  $('#m-vol-val').textContent = vol + '%';
}
$$('[data-m]').forEach((b) => b.addEventListener('click', (e) => {
  e.stopPropagation();
  const m = b.dataset.m;
  if (m === 'play') playing = !playing;
  if (m === 'stop') { playing = false; pos = 0; }
  if (m === 'next') { song = (song + 1) % SONGS.length; pos = 0; }
  if (m === 'prev') { if (pos > 3) pos = 0; else { song = (song + SONGS.length - 1) % SONGS.length; pos = 0; } }
  if (m === 'volup') vol = Math.min(100, vol + 5);
  if (m === 'voldown') vol = Math.max(0, vol - 5);
  renderMedia();
}));
$('#m-vol').addEventListener('input', (e) => { vol = Number(e.target.value); renderMedia(); });
renderMedia();

// ================= To-Do =================
const today = new Date();
const inDays = (n) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
let todos = [
  { id: 1, text: 'Kirim laporan mingguan', done: false, date: inDays(2) },
  { id: 2, text: 'Beli kopi untuk rapat', done: true, date: null },
  { id: 3, text: 'Coba fitur timer NotchNow', done: false, date: inDays(0) },
];
function renderTodos() {
  $('#todo-list').innerHTML = todos.length ? todos.map((t) => `
    <li class="${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="chk" data-act="toggle">${t.done ? '✓' : ''}</button>
      <span class="txt">${esc(t.text)}</span>
      <button class="del" data-act="del" aria-label="Hapus">✕</button>
    </li>`).join('') : '<li class="empty">Tidak ada tugas. Tambahkan di atas ✨</li>';
}
$('#todo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#todo-input').value.trim();
  if (!v) return;
  todos.unshift({ id: Date.now(), text: v, done: false, date: null });
  $('#todo-input').value = '';
  renderTodos();
});
$('#todo-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.stopPropagation();
  const id = Number(b.closest('li').dataset.id);
  if (b.dataset.act === 'toggle') todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  else todos = todos.filter((t) => t.id !== id);
  renderTodos();
});
renderTodos();

// ================= Kalender =================
let hijriDay = null;
let hijriFull = null;
try {
  hijriDay = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric' });
  hijriFull = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
} catch { /* browser tanpa kalender Islam */ }
let view = new Date(today.getFullYear(), today.getMonth(), 1);
let sel = ymd(today);
function renderCal() {
  $('#c-title').textContent = view.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const off = (view.getDay() + 6) % 7;
  const marks = new Set(todos.filter((t) => t.date && !t.done).map((t) => t.date));
  let html = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(view.getFullYear(), view.getMonth(), 1 - off + i);
    const k = ymd(d);
    const cls = ['c-day'];
    if (d.getMonth() !== view.getMonth()) cls.push('other');
    if (k === ymd(today)) cls.push('today');
    if (k === sel) cls.push('sel');
    if (d.getDay() === 0) cls.push('sun');
    if (d.getDay() === 5) cls.push('fri');
    html += `<button class="${cls.join(' ')}" data-d="${k}"><span>${d.getDate()}</span>${hijriDay ? `<small>${hijriDay.format(d)}</small>` : ''}${marks.has(k) ? '<i class="dot"></i>' : ''}</button>`;
  }
  $('#c-grid').innerHTML = html;
  const [y, m, dd] = sel.split('-').map(Number);
  const sd = new Date(y, m - 1, dd);
  $('#c-date').textContent = sd.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#c-hijri').textContent = hijriFull ? hijriFull.format(sd) : '';
}
$('#c-grid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]');
  if (!b) return;
  e.stopPropagation();
  sel = b.dataset.d;
  renderCal();
});
$('#c-prev').addEventListener('click', (e) => { e.stopPropagation(); view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
$('#c-next').addEventListener('click', (e) => { e.stopPropagation(); view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });

// ================= Timer =================
const C = 2 * Math.PI * 88;
$('#t-prg').style.strokeDasharray = C;
let tDur = 10000;
let tRem = 10000;
let tEnd = null;
const tLeft = () => (tEnd ? Math.max(0, tEnd - Date.now()) : tRem);
function renderTimer() {
  const r = tLeft();
  $('#t-num').textContent = clock(r);
  $('#t-prg').style.strokeDashoffset = C * (1 - r / tDur);
  $('#t-start').textContent = tEnd ? 'Jeda' : tRem < tDur && tRem > 0 ? 'Lanjutkan' : 'Mulai';
  $$('.t-presets button').forEach((b) => b.classList.toggle('active', Number(b.dataset.s) * 1000 === tDur));
}
$$('.t-presets button').forEach((b) => b.addEventListener('click', (e) => {
  e.stopPropagation();
  tDur = tRem = Number(b.dataset.s) * 1000;
  tEnd = null;
  renderTimer();
}));
$('#t-start').addEventListener('click', (e) => {
  e.stopPropagation();
  actx = actx || new AudioContext(); // izinkan audio dari klik pengguna
  if (tEnd) { tRem = tLeft(); tEnd = null; } else { if (tRem <= 0) tRem = tDur; tEnd = Date.now() + tRem; }
  renderTimer();
});
$('#t-reset').addEventListener('click', (e) => { e.stopPropagation(); tEnd = null; tRem = tDur; renderTimer(); });
renderTimer();

// ================= Alarm =================
let alarms = [
  { id: 1, time: '05:00', label: 'Bangun pagi', on: true, daily: true },
  { id: 2, time: '13:00', label: 'Rapat tim', on: false, daily: false },
];
let firedKey = '';
function renderAlarms() {
  $('#alarm-list').innerHTML = alarms.length ? alarms.slice().sort((a, b) => a.time.localeCompare(b.time)).map((a) => `
    <li class="${a.on ? '' : 'off'}" data-id="${a.id}">
      <span class="a-time">${a.time}</span>
      <span class="txt">${esc(a.label || 'Alarm')} <small style="color:#8e8e93">· ${a.daily ? 'Setiap hari' : 'Sekali'}</small></span>
      <button class="sw ${a.on ? 'on' : ''}" data-act="toggle" aria-label="Aktif/nonaktif"></button>
      <button class="del" data-act="del" aria-label="Hapus">✕</button>
    </li>`).join('') : '<li class="empty">Belum ada alarm.</li>';
}
$('#alarm-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const time = $('#alarm-time').value;
  if (!time) return;
  actx = actx || new AudioContext();
  alarms.push({ id: Date.now(), time, label: $('#alarm-label').value.trim(), on: true, daily: false });
  $('#alarm-label').value = '';
  renderAlarms();
});
$('#alarm-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.stopPropagation();
  const id = Number(b.closest('li').dataset.id);
  if (b.dataset.act === 'toggle') alarms = alarms.map((a) => (a.id === id ? { ...a, on: !a.on } : a));
  else alarms = alarms.filter((a) => a.id !== id);
  renderAlarms();
});
renderAlarms();
const now0 = new Date();
$('#alarm-time').value = `${pad(now0.getHours())}:${pad((now0.getMinutes() + 1) % 60)}`;

// ================= Waktu sholat =================
const PRAYERS = [['Imsak', 'Imsak'], ['Fajr', 'Subuh'], ['Sunrise', 'Terbit'], ['Dhuhr', 'Dzuhur'], ['Asr', 'Ashar'], ['Maghrib', 'Maghrib'], ['Isha', 'Isya']];
const FIVE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
let times = { Imsak: '03:55', Fajr: '04:05', Sunrise: '05:26', Dhuhr: '11:36', Asr: '14:55', Maghrib: '17:47', Isha: '18:59' };
const atToday = (hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
function nextPrayer() {
  const n = Date.now();
  for (const [k, label] of PRAYERS) if (FIVE.includes(k) && atToday(times[k]) > n) return { k, label, at: atToday(times[k]) };
  return { k: 'Fajr', label: 'Subuh', at: atToday(times.Fajr) + 864e5, tomorrow: true };
}
let lastGrid = '';
function renderPray() {
  const nx = nextPrayer();
  const n = Date.now();
  const html = PRAYERS.map(([k, label]) => {
    const cls = ['pc'];
    if (!FIVE.includes(k)) cls.push('minor');
    if (nx.k === k) cls.push('next'); else if (atToday(times[k]) <= n) cls.push('passed');
    return `<div class="${cls.join(' ')}"><span>${label}</span><b>${times[k]}</b></div>`;
  }).join('');
  if (html !== lastGrid) { $('#p-grid').innerHTML = html; lastGrid = html; }
  $('#p-next').textContent = `Menuju ${nx.label}${nx.tomorrow ? ' (besok)' : ''}`;
  $('#p-count').textContent = clock(nx.at - n).padStart(8, '00:');
  return nx;
}
$('#p-loc').addEventListener('click', (e) => {
  e.stopPropagation();
  const btn = e.currentTarget;
  if (!navigator.geolocation) { btn.textContent = 'Lokasi tidak didukung browser ini'; return; }
  btn.textContent = 'Mencari lokasi…';
  navigator.geolocation.getCurrentPosition(async (p) => {
    try {
      const d = new Date();
      const url = `https://api.aladhan.com/v1/timings/${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&method=20`;
      const j = await (await fetch(url)).json();
      PRAYERS.forEach(([k]) => { times[k] = String(j.data.timings[k]).slice(0, 5); });
      $('#p-place').textContent = `Lokasi Anda (${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)})`;
      $('#p-sub').textContent = `${j.data.meta.timezone} · metode Kemenag RI`;
      btn.textContent = '✓ Jadwal sesuai lokasi Anda';
      lastGrid = '';
      renderPray();
    } catch {
      btn.textContent = 'Gagal memuat jadwal, coba lagi';
    }
  }, () => { btn.textContent = 'Izin lokasi ditolak'; }, { timeout: 10000 });
});

// ================= Loop =================
let lastTick = Date.now();
let lastMini = '';
function tick() {
  const d = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $('#mini-time').textContent = hm;
  $('#n-clock').textContent = hm;

  const dt = (Date.now() - lastTick) / 1000;
  lastTick = Date.now();
  if (playing) {
    pos += dt;
    if (pos >= SONGS[song].dur) { song = (song + 1) % SONGS.length; pos = 0; }
    renderMedia();
  }

  if (tEnd && Date.now() >= tEnd) {
    tEnd = null; tRem = 0;
    ring('Timer selesai!', `Waktu ${tDur >= 60000 ? Math.round(tDur / 60000) + ' menit' : Math.round(tDur / 1000) + ' detik'} telah habis.`);
  }
  renderTimer();

  const key = `${ymd(d)} ${hm}`;
  if (key !== firedKey) {
    const a = alarms.find((x) => x.on && x.time === hm);
    if (a) {
      firedKey = key;
      if (!a.daily) alarms = alarms.map((x) => (x.id === a.id ? { ...x, on: false } : x));
      renderAlarms();
      ring(a.label || 'Alarm', `Sekarang pukul ${a.time}`);
    }
  }

  const nx = renderPray();

  // isi tampilan mini
  let html = '';
  let wide = false;
  if (tEnd) { html = `<span class="mini-timer">⏱ ${clock(tLeft())}</span>`; wide = true; }
  else if (playing) { html = `<span class="mini-song">${esc(SONGS[song].title)}</span><span class="eq"><i></i><i></i><i></i><i></i></span>`; wide = true; }
  else html = `☾ ${nx.label} ${times[nx.k]}`;
  if (html !== lastMini) { $('#mini-right').innerHTML = html; lastMini = html; }
  notch.classList.toggle('wide', wide);
  $('#brand-dot').className = tEnd ? 'timer' : playing ? 'music' : '';
}
tick();
setInterval(tick, 250);
