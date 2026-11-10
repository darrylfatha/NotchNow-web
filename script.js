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
let pinned = false;

function setOpen(v) {
  open = v;
  notch.classList.toggle('open', v);
  if (v) $('#demo-hint').textContent = 'Coba tab-tabnya: semuanya bisa diklik';
}
function scheduleClose(delay = 450) {
  clearTimeout(closeT);
  closeT = setTimeout(() => {
    if (hovered || ringing || pinned || Date.now() < holdUntil) return;
    if (notch.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    setOpen(false);
  }, delay);
}
if (!isTouch) {
  notch.addEventListener('mouseenter', () => { hovered = true; clearTimeout(closeT); setTimeout(() => hovered && setOpen(true), 80); });
  notch.addEventListener('mouseleave', () => { hovered = false; holdUntil = 0; scheduleClose(); });
}
notch.addEventListener('click', () => { if (!open) setOpen(true); });
document.addEventListener('click', (e) => {
  if (open && !pinned && !notch.contains(e.target) && !e.target.closest('.feature') && !ringing) { holdUntil = 0; setOpen(false); }
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
  if (name === 'launcher') setTimeout(() => $('#lx-input').focus({ preventScroll: true }), 50);
  if (name === 'notes') renderNotes();
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
    if (go === 'lyrics') {
      showTab('media');
      showLyrics = true;
      playing = true;
      renderLyrics();
      renderMedia();
    } else showTab(go);
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
// Lirik contoh di bawah ini ditulis khusus untuk demo (bukan lirik lagu sungguhan).
const SONGS = [
  { title: 'Senja di Kota', artist: 'Band Demo', dur: 204, art: 'linear-gradient(135deg,#ff7a59,#b33cff 55%,#3a4bff)', accent: '#d9a6ff',
    lyrics: ['Lampu kota mulai menyala', 'Langkahku pelan di trotoar', 'Senja jingga menyapa kita', 'Di antara riuh yang samar',
      'Biar waktu terus berjalan', 'Aku tetap di sini menunggu', 'Senja di kota, peluk aku', 'Sebelum malam datang merayu', '♪'] },
  { title: 'Hujan Pertama', artist: 'Kilau Biru', dur: 187, art: 'linear-gradient(135deg,#30d158,#0a84ff)', accent: '#7fe0ff',
    lyrics: ['Rintik pertama jatuh di jendela', 'Aroma tanah memanggil namamu', 'Kubiarkan basah menyentuh kepala', 'Seperti dulu saat kau di situ',
      'Hujan pertama, jangan cepat reda', 'Biar kuingat semua yang tersisa', '♪'] },
  { title: 'Jalan Pulang', artist: 'Orkes Malam', dur: 231, art: 'linear-gradient(135deg,#ffd60a,#ff375f)', accent: '#ffc27a',
    lyrics: ['Jalan pulang terasa panjang', 'Lampu-lampu berbaris tenang', 'Kuhitung bintang satu per satu', 'Sambil bersenandung lagu lamamu',
      'Bawa aku pulang, pulang', 'Ke tempat hatiku tenang', '♪'] },
];
// Beri penanda waktu: baris pertama di detik ke-4, lalu tiap 4,5 detik, berulang sampai lagu selesai.
SONGS.forEach((s) => {
  s.lines = [];
  for (let t = 4, i = 0; t < s.dur - 3; t += 4.5, i++) s.lines.push({ t, text: s.lyrics[i % s.lyrics.length] });
});
let showLyrics = false;
let lyIdx = -2;
function renderLyrics() {
  $('.m-grid').classList.toggle('lyrics', showLyrics);
  $('#ly-btn').classList.toggle('active', showLyrics);
  $('#ly-track').innerHTML = SONGS[song].lines.map((l) => `<div class="ly-line">${esc(l.text)}</div>`).join('');
  $('#ly-track').style.transform = '';
  lyIdx = -2;
  updateLyrics();
}
function currentLine() {
  const lines = SONGS[song].lines;
  let idx = -1;
  for (let i = 0; i < lines.length && lines[i].t <= pos; i++) idx = i;
  return idx;
}
function updateLyrics() {
  const idx = currentLine();
  if (idx === lyIdx) return;
  lyIdx = idx;
  const els = $$('#ly-track .ly-line');
  els.forEach((el, i) => { el.classList.toggle('active', i === idx); el.classList.toggle('past', i < idx); });
  const box = $('#m-lyrics');
  const el = els[Math.max(0, idx)];
  if (el) $('#ly-track').style.transform = `translateY(${-(el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2)}px)`;
}
$('#ly-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  showLyrics = !showLyrics;
  if (showLyrics && !playing) playing = true;
  renderLyrics();
  renderMedia();
});
let song = 0;
let pos = 0;
let playing = false;
let vol = 40;
let seekDrag = false;
function renderMedia() {
  const s = SONGS[song];
  if ($('#ly-track').dataset.song !== String(song)) { $('#ly-track').dataset.song = String(song); renderLyrics(); }
  updateLyrics();
  $('#mini-art').style.background = s.art;
  notch.style.setProperty('--art', s.art);
  notch.style.setProperty('--accent2', s.accent);
  notch.classList.add('art-mode');
  notch.classList.toggle('paused', !playing);
  $('#m-title').textContent = s.title;
  $('#m-artist').textContent = s.artist;
  $('#m-art').style.background = s.art;
  $('#m-art').classList.toggle('playing', playing);
  $('#m-play').textContent = playing ? '⏸' : '▶';
  $('#m-state').textContent = playing ? 'memutar' : 'dijeda';
  if (!seekDrag) $('#m-pos').textContent = mmss(pos);
  $('#m-dur').textContent = mmss(s.dur);
  if (!seekDrag) {
    $('#m-seek').value = (pos / s.dur) * 1000;
    $('#m-seek').style.setProperty('--p', `${(pos / s.dur) * 100}%`);
  }
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
// Slider untuk memajukan / memundurkan lagu demo.
$('#m-seek').addEventListener('input', (e) => {
  seekDrag = true;
  const v = Number(e.target.value) / 1000;
  e.target.style.setProperty('--p', `${v * 100}%`);
  $('#m-pos').textContent = mmss(v * SONGS[song].dur);
});
$('#m-seek').addEventListener('change', (e) => {
  seekDrag = false;
  pos = (Number(e.target.value) / 1000) * SONGS[song].dur;
  renderMedia();
});
$('#m-vol').addEventListener('input', (e) => { vol = Number(e.target.value); renderMedia(); });
renderMedia();

// ================= To-Do =================
const today = new Date();
const inDays = (n) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
let todos = [
  { id: 1, text: 'Kirim laporan mingguan', done: false, date: inDays(2), time: '15:00', prio: 2, rep: 'Mingguan' },
  { id: 2, text: 'Beli kopi untuk rapat', done: true, date: null, prio: 1 },
  { id: 3, text: 'Coba fitur peluncur NotchNow', done: false, date: inDays(0), time: '10:30', prio: 1 },
  { id: 4, text: 'Bayar tagihan internet', done: false, date: inDays(5), prio: 0, rep: 'Bulanan' },
];
function renderTodos() {
  $('#todo-list').innerHTML = todos.length ? todos.map((t) => `
    <li class="${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="chk" data-act="toggle">${t.done ? '✓' : ''}</button>
      <i class="prio p${t.prio ?? 1}"></i><span class="txt">${esc(t.text)}</span>${t.rep ? `<span class="chip">↻ ${t.rep}</span>` : ''}${t.time || t.date ? `<span class="chip">${t.date ? fmtShort(t.date) : ''}${t.time ? ' ' + t.time : ''}</span>` : ''}
      <button class="del" data-act="del" aria-label="Hapus">✕</button>
    </li>`).join('') : '<li class="empty">Tidak ada tugas. Tambahkan di atas ✨</li>';
}
$('#todo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#todo-input').value.trim();
  if (!v) return;
  const tm = $('#todo-time').value;
  todos.unshift({ id: Date.now(), text: v, done: false, date: tm ? ymd(today) : null, time: tm || null, prio: Number($('#todo-prio').value) });
  $('#todo-input').value = '';
  $('#todo-time').value = '';
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
    const hd = HOL.get(k);
    if (hd) cls.push(hd.type === 'c' ? 'cuti' : 'libur');
    html += `<button class="${cls.join(' ')}" data-d="${k}"${hd ? ` title="${esc(hd.name)}"` : ''}><span>${d.getDate()}</span>${hijriDay ? `<small>${hijriDay.format(d)}</small>` : ''}${marks.has(k) ? '<i class="dot"></i>' : ''}</button>`;
  }
  $('#c-grid').innerHTML = html;
  const [y, m, dd] = sel.split('-').map(Number);
  const sd = new Date(y, m - 1, dd);
  $('#c-date').textContent = sd.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#c-hijri').textContent = hijriFull ? hijriFull.format(sd) : '';
  const hs = HOL.get(sel);
  $('#c-hol').innerHTML = hs ? `<span class="hol-chip ${hs.type === 'c' ? 'cuti' : 'libur'}">${esc(hs.name)}</span>` : '';
  renderHolCd();
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
  $('#n-date').textContent = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

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
  let lyric = false;
  const li = playing ? currentLine() : -1;
  const lineText = li >= 0 ? SONGS[song].lines[li].text : '';
  if (tEnd) { html = `<span class="mini-timer">⏱ ${clock(tLeft())}</span>`; wide = true; }
  else if (playing && lineText && lineText !== '♪') {
    html = `<span class="mini-lyric">${esc(lineText)}</span><span class="eq"><i></i><i></i><i></i><i></i></span>`; wide = true; lyric = true;
  } else if (playing) { html = `<span class="mini-song">${esc(SONGS[song].title)}</span><span class="eq"><i></i><i></i><i></i><i></i></span>`; wide = true; }
  else html = `☾ ${nx.label} ${times[nx.k]}`;
  if (html !== lastMini) { $('#mini-right').innerHTML = html; lastMini = html; }
  notch.classList.toggle('wide', wide);
  notch.classList.toggle('lyric', lyric);
  notch.classList.toggle('playing', playing && !tEnd);
  $('#brand-dot').className = tEnd ? 'timer' : playing ? 'music' : '';
}
tick();
setInterval(tick, 250);


// ================= v1.5: ikon tab =================
const ICONS = {
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  todo: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 12h8M8 16h5"/>',
  tray: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>',
  clip: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M5 3 2 6M22 6l-3-3"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  pin: '<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', svg(el.dataset.icon)));

// ================= v1.5: sematkan & transparansi =================
$('#n-pin').addEventListener('click', (e) => {
  e.stopPropagation();
  pinned = !pinned;
  $('#n-pin').classList.toggle('on', pinned);
  if (!pinned && !hovered) scheduleClose(300);
});
const OPS = [1, 0.6, 0.25];
let opIdx = 0;
$('#n-op').addEventListener('click', (e) => {
  e.stopPropagation();
  opIdx = (opIdx + 1) % OPS.length;
  notch.style.setProperty('--bg-a', OPS[opIdx]);
  $('#n-op').title = 'Latar ' + Math.round(OPS[opIdx] * 100) + '% (klik untuk mengganti)';
});

// ================= v1.5.1: kilau kaca hanya saat kursor di atasnya =================
$$('.n-tabs, .m-vol').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', ((e.clientX - r.left) / r.width) * 100 + '%');
    el.style.setProperty('--gy', ((e.clientY - r.top) / r.height) * 100 + '%');
    el.classList.add('glow');
  });
  el.addEventListener('pointerleave', () => el.classList.remove('glow'));
});

// ================= v1.5.1: latar berdenyut mengikuti beat (simulasi) =================
// Di aplikasi aslinya, level suara dibaca dari Windows. Di demo ini beatnya dibuat dari tempo lagu contoh.
const BPM = [104, 92, 118];
const beatFx = $('#beat-fx');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let beatShown = 0;
(function beatLoop() {
  let target = 0;
  if (playing && !calm) {
    const per = 60 / BPM[song];
    const bt = performance.now() / 1000;
    const ph = (bt % per) / per;                        // 0..1 dalam satu ketukan
    const strong = Math.floor(bt / per) % 4 === 0;       // ketukan pertama tiap bar lebih kuat
    target = Math.exp(-ph * 5) * (strong ? 1 : 0.7) + 0.12;
  }
  beatShown += (target - beatShown) * (target > beatShown ? 0.6 : 0.18);
  beatFx.style.setProperty('--beat', beatShown.toFixed(3));
  notch.classList.toggle('beating', playing && !calm);
  requestAnimationFrame(beatLoop);
})();

// ================= v1.5: libur nasional & cuti bersama =================
var HOL = new Map([["2026-01-01","Hari Tahun Baru","l"],["2026-01-16","Isra Mikraj Nabi Muhammad","l"],["2026-02-16","Cuti Bersama Tahun Baru Imlek","c"],["2026-02-17","Tahun Baru Imlek","l"],["2026-03-18","Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka)","c"],["2026-03-19","Hari Suci Nyepi (Tahun Baru Saka)","l"],["2026-03-20","Cuti Bersama Idul Fitri","c"],["2026-03-21","Hari Idul Fitri","l"],["2026-03-22","Hari Idul Fitri","l"],["2026-03-23","Cuti Bersama Idul Fitri","c"],["2026-03-24","Cuti Bersama Idul Fitri","c"],["2026-04-03","Wafat Isa Almasih","l"],["2026-04-05","Hari Paskah","l"],["2026-05-01","Hari Buruh Internasional / Pekerja","l"],["2026-05-14","Kenaikan Isa Al Masih","l"],["2026-05-15","Cuti Bersama Kenaikan Isa Al Masih","c"],["2026-05-27","Idul Adha (Lebaran Haji)","l"],["2026-05-28","Idul Adha (Lebaran Haji)","l"],["2026-05-31","Hari Raya Waisak","l"],["2026-06-01","Hari Lahir Pancasila","l"],["2026-06-16","Hari Kedua Muharram","l"],["2026-08-17","Hari Proklamasi Kemerdekaan R.I.","l"],["2026-08-25","Maulid Nabi Muhammad","l"],["2026-12-24","Cuti Bersama Natal (Malam Natal)","c"],["2026-12-25","Hari Raya Natal","l"],["2027-01-01","Hari Tahun Baru","l"],["2027-01-05","Isra Mikraj Nabi Muhammad (belum pasti)","l"],["2027-02-05","Cuti Bersama Tahun Baru Imlek","c"],["2027-02-06","Tahun Baru Imlek","l"],["2027-03-08","Hari Suci Nyepi (Tahun Baru Saka)","l"],["2027-03-09","Cuti Bersama Idul Fitri","c"],["2027-03-10","Hari Idul Fitri (belum pasti)","l"],["2027-03-11","Hari Idul Fitri (belum pasti)","l"],["2027-03-12","Cuti Bersama Idul Fitri","c"],["2027-03-15","Cuti Bersama Idul Fitri","c"],["2027-03-25","Joint Holiday for Good Friday","l"],["2027-03-26","Wafat Isa Almasih","l"],["2027-05-01","Hari Buruh Internasional / Pekerja","l"],["2027-05-06","Kenaikan Isa Al Masih","l"],["2027-05-17","Idul Adha (Lebaran Haji) (belum pasti)","l"],["2027-05-18","Idul Adha (Lebaran Haji)","l"],["2027-05-19","Cuti Bersama Waisak","c"],["2027-05-20","Hari Raya Waisak","l"],["2027-06-01","Hari Lahir Pancasila","l"],["2027-06-06","Satu Muharam / Tahun Baru Hijriah (belum pasti)","l"],["2027-08-15","Maulid Nabi Muhammad (belum pasti)","l"],["2027-08-17","Hari Proklamasi Kemerdekaan R.I.","l"],["2027-12-24","Cuti Bersama Natal (Malam Natal)","c"],["2027-12-25","Hari Raya Natal","l"]].map(([date, name, type]) => [date, { date, name, type }]));
function fmtShort(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); }
function renderHolCd() {
  const now = new Date();
  const todayK = ymd(now);
  const list = [...HOL.values()].filter((x) => x.date > todayK);
  if (!list.length) { $('#hol-name').textContent = '—'; return; }
  const first = list[0];
  // Libur berurutan digabung jadi satu rentang (mis. cuti bersama + hari raya).
  let end = first.date;
  for (const x of list.slice(1)) {
    const [y, m, d] = end.split('-').map(Number);
    if (x.date === ymd(new Date(y, m - 1, d + 1))) end = x.date; else break;
  }
  const [y, m, d] = first.date.split('-').map(Number);
  const ms = new Date(y, m - 1, d) - now;
  const days = Math.floor(ms / 864e5), hrs = Math.floor((ms % 864e5) / 36e5);
  $('#hol-name').textContent = first.name;
  $('#hol-date').textContent = fmtShort(first.date) + (end !== first.date ? ' – ' + fmtShort(end) : '') + ' ' + y;
  $('#hol-left').textContent = days > 0 ? `${days} hari ${hrs} jam lagi` : `${hrs} jam lagi`;
}

// ================= v1.5: catatan cepat =================
let notes = [
  { id: 1, text: 'Ide konten minggu depan:\n- Review aplikasi produktivitas\n- Tips belajar 25 menit (pomodoro)' },
  { id: 2, text: 'No. resi paket: JNE 0123 4567 89' },
];
let noteSel = 1;
function renderNotes() {
  $('#nt-list').innerHTML = notes.map((n) => `<li class="${n.id === noteSel ? 'sel' : ''}" data-id="${n.id}">${esc((n.text.split('\n')[0] || 'Catatan kosong').slice(0, 40))}</li>`).join('');
  const n = notes.find((x) => x.id === noteSel);
  if (document.activeElement !== $('#nt-text')) $('#nt-text').value = n ? n.text : '';
}
$('#nt-list').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  e.stopPropagation();
  noteSel = Number(li.dataset.id);
  $('#nt-text').value = notes.find((x) => x.id === noteSel).text;
  renderNotes();
});
$('#nt-new').addEventListener('click', (e) => {
  e.stopPropagation();
  const id = Date.now();
  notes.unshift({ id, text: '' });
  noteSel = id;
  $('#nt-text').value = '';
  renderNotes();
  $('#nt-text').focus();
});
$('#nt-text').addEventListener('input', (e) => {
  const n = notes.find((x) => x.id === noteSel);
  if (n) { n.text = e.target.value; renderNotes(); }
});

// ================= v1.5: rak file =================
let shelf = [
  { name: 'Laporan-Kuartal-3.pdf', size: '1,2 MB' },
  { name: 'Foto-liburan.jpg', size: '3,4 MB' },
  { name: 'Presentasi-klien.pptx', size: '8,9 MB' },
];
const fileIco = (n) => /\.(jpe?g|png|gif|webp|heic)$/i.test(n) ? '🖼️' : /\.pdf$/i.test(n) ? '📕' : /\.(pptx?|key)$/i.test(n) ? '📊' : /\.(xlsx?|csv)$/i.test(n) ? '📗' : /\.(docx?|txt|md)$/i.test(n) ? '📘' : /\.(mp3|wav|flac|m4a)$/i.test(n) ? '🎵' : /\.(mp4|mov|mkv)$/i.test(n) ? '🎬' : /\.(zip|rar|7z)$/i.test(n) ? '🗜️' : '📄';
const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
function renderShelf() {
  $('#sh-list').innerHTML = shelf.map((f, i) => `<li><span class="sh-ico">${fileIco(f.name)}</span><span class="sh-name">${esc(f.name)}</span><small>${f.size}</small><button class="del" data-i="${i}" aria-label="Hapus dari rak">✕</button></li>`).join('');
}
$('#sh-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]');
  if (!b) return;
  e.stopPropagation();
  shelf.splice(Number(b.dataset.i), 1);
  renderShelf();
});
['dragenter', 'dragover'].forEach((t) => notch.addEventListener(t, (e) => {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
  e.preventDefault();
  if (!open) setOpen(true);
  showTab('shelf');
  holdUntil = Date.now() + 4000;
  $('#sh-drop').classList.add('over');
}));
notch.addEventListener('dragleave', () => $('#sh-drop').classList.remove('over'));
notch.addEventListener('drop', (e) => {
  e.preventDefault();
  $('#sh-drop').classList.remove('over');
  // Hanya nama dan ukuran yang dibaca; file tidak diunggah ke mana pun.
  Array.from(e.dataTransfer.files || []).forEach((f) => shelf.unshift({ name: f.name, size: fmtSize(f.size) }));
  renderShelf();
});
renderShelf();

// ================= v1.5: riwayat clipboard =================
let clips = [
  { id: 1, text: 'https://darrylfatha.github.io/NotchNow-web/', pin: true, ago: '2 mnt' },
  { id: 2, text: 'Rapat diundur ke Kamis pukul 14.00', pin: false, ago: '8 mnt' },
  { id: 3, text: 'Jl. Merdeka No. 17, Bandung', pin: false, ago: '25 mnt' },
  { id: 4, text: 'npm run dist', pin: false, ago: '1 jam' },
];
let clipPaused = false;
function renderClips() {
  const q = $('#cl-search').value.trim().toLowerCase();
  const list = clips.filter((c) => !q || c.text.toLowerCase().includes(q)).sort((a, b) => b.pin - a.pin);
  $('#cl-list').innerHTML = list.length ? list.map((c) => `<li data-id="${c.id}"><button class="cl-pin ${c.pin ? 'on' : ''}" data-act="pin" aria-label="Sematkan">★</button><span class="txt" data-act="copy" title="Klik untuk menyalin">${esc(c.text)}</span><small>${c.ago}</small><button class="del" data-act="del" aria-label="Hapus">✕</button></li>`).join('') : '<li class="empty">Tidak ada yang cocok.</li>';
}
$('#cl-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.stopPropagation();
  const id = Number(b.closest('li').dataset.id);
  const c = clips.find((x) => x.id === id);
  if (b.dataset.act === 'pin') c.pin = !c.pin;
  if (b.dataset.act === 'del') clips = clips.filter((x) => x.id !== id);
  if (b.dataset.act === 'copy') {
    try { await navigator.clipboard.writeText(c.text); } catch { /* izin clipboard ditolak */ }
    b.textContent = '✓ Disalin';
    setTimeout(renderClips, 900);
    return;
  }
  renderClips();
});
$('#cl-search').addEventListener('input', renderClips);
$('#cl-pause').addEventListener('click', (e) => {
  e.stopPropagation();
  clipPaused = !clipPaused;
  $('#cl-pause').textContent = clipPaused ? 'Lanjutkan' : 'Jeda';
  $('#cl-pause').classList.toggle('on', clipPaused);
});
// Teks yang Anda salin di halaman ini langsung masuk ke riwayat demo.
document.addEventListener('copy', () => {
  const t = String(window.getSelection() || '').trim();
  if (!t || clipPaused) return;
  clips = clips.filter((c) => c.text !== t);
  clips.unshift({ id: Date.now(), text: t.slice(0, 300), pin: false, ago: 'baru' });
  renderClips();
});
renderClips();

// ================= v1.5: peluncur =================
const APPS = [['Microsoft Word', '📘'], ['Microsoft Excel', '📗'], ['PowerPoint', '📙'], ['Spotify', '🎧'], ['Google Chrome', '🌐'], ['Kalkulator', '🧮'],
  ['Pengaturan', '⚙️'], ['File Explorer', '📁'], ['WhatsApp', '💬'], ['Visual Studio Code', '🧑‍💻'], ['Paint', '🎨'], ['Notepad', '📝'], ['Kamera', '📷']];
const UNITS = { km: ['m', 1000], m: ['m', 1], cm: ['m', 0.01], mm: ['m', 0.001], mil: ['m', 1609.344], mi: ['m', 1609.344], ft: ['m', 0.3048], kaki: ['m', 0.3048], inci: ['m', 0.0254], in: ['m', 0.0254],
  kg: ['g', 1000], g: ['g', 1], lb: ['g', 453.592], pon: ['g', 453.592], oz: ['g', 28.3495], l: ['l', 1], ml: ['l', 0.001], gal: ['l', 3.78541] };
function calc(src) {
  // Parser kecil: + - * / % ^ dan kurung. Tanpa eval.
  const s = src.replace(/,/g, '.').replace(/x/gi, '*').replace(/\s+/g, '');
  if (!/^[\d.+\-*/%^()]+$/.test(s) || !/\d/.test(s) || !/[+\-*/%^]/.test(s.replace(/^-/, ''))) return null;
  let i = 0;
  const num = () => { const m = s.slice(i).match(/^\d+(\.\d+)?/); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
  const atom = () => { if (s[i] === '-') { i++; return -atom(); } if (s[i] === '(') { i++; const v = add(); if (s[i++] !== ')') throw 0; return v; } return num(); };
  const pow = () => { let v = atom(); while (s[i] === '^') { i++; v = Math.pow(v, atom()); } return v; };
  const mul = () => { let v = pow(); while ('*/%'.includes(s[i]) && s[i]) { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; };
  const add = () => { let v = mul(); while ('+-'.includes(s[i]) && s[i]) { const o = s[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  try { const v = add(); return i === s.length && Number.isFinite(v) ? v : null; } catch { return null; }
}
const fmtNum = (v) => Number(v.toFixed(6)).toLocaleString('id-ID', { maximumFractionDigits: 6 });
function convert(q) {
  const m = q.toLowerCase().match(/^(-?[\d.,]+)\s*([a-z°]+)\s+(?:ke|to|=|in)\s+([a-z°]+)$/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const a = m[2].replace('°', ''), b = m[3].replace('°', '');
  if ((a === 'c' || a === 'f') && (b === 'c' || b === 'f') && a !== b) return `${fmtNum(a === 'c' ? v * 9 / 5 + 32 : (v - 32) * 5 / 9)} °${b.toUpperCase()}`;
  if (UNITS[a] && UNITS[b] && UNITS[a][0] === UNITS[b][0]) return `${fmtNum((v * UNITS[a][1]) / UNITS[b][1])} ${m[3]}`;
  return null;
}
let lxItems = [];
let lxSel = 0;
function renderLauncher() {
  const q = $('#lx-input').value.trim();
  const items = [];
  if (q) {
    const c = calc(q);
    if (c != null) items.push({ ico: '🧮', title: '= ' + fmtNum(c), sub: 'Hasil hitung · Enter untuk menyalin', act: 'copy', val: String(Number(c.toFixed(6))) });
    const cv = convert(q);
    if (cv) items.push({ ico: '📐', title: cv, sub: 'Konversi satuan · Enter untuk menyalin', act: 'copy', val: cv });
    const lq = q.toLowerCase();
    APPS.map(([n, ico]) => ({ n, ico, s: n.toLowerCase().startsWith(lq) ? 3 : n.toLowerCase().split(' ').some((w) => w.startsWith(lq)) ? 2 : n.toLowerCase().includes(lq) ? 1 : 0 }))
      .filter((a) => a.s).sort((a, b) => b.s - a.s).slice(0, 4)
      .forEach((a) => items.push({ ico: a.ico, title: a.n, sub: 'Aplikasi', act: 'app' }));
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q)) items.push({ ico: '🔗', title: 'Buka ' + q, sub: 'Alamat web', act: 'url', val: /^https?:/i.test(q) ? q : 'https://' + q });
    items.push({ ico: '🔎', title: `Cari "${q}" di Google`, sub: 'Pencarian web', act: 'google', val: q });
  } else {
    ['Spotify', 'Microsoft Word', 'Kalkulator'].forEach((n) => items.push({ ico: APPS.find((a) => a[0] === n)[1], title: n, sub: 'Sering dibuka', act: 'app' }));
  }
  lxItems = items;
  lxSel = Math.min(lxSel, items.length - 1);
  $('#lx-list').innerHTML = items.map((it, i) => `<li class="${i === lxSel ? 'sel' : ''}" data-i="${i}"><span class="lx-i">${it.ico}</span><span class="lx-t">${esc(it.title)}<small>${esc(it.sub)}</small></span></li>`).join('');
}
async function lxRun(i) {
  const it = lxItems[i];
  if (!it) return;
  const li = $$('#lx-list li')[i];
  if (it.act === 'copy') { try { await navigator.clipboard.writeText(it.val); } catch { /* abaikan */ } li.querySelector('small').textContent = '✓ Disalin'; return; }
  if (it.act === 'google') { window.open('https://www.google.com/search?q=' + encodeURIComponent(it.val), '_blank', 'noopener'); return; }
  if (it.act === 'url') { window.open(it.val, '_blank', 'noopener'); return; }
  li.querySelector('small').textContent = 'Di aplikasi aslinya, ' + it.title + ' langsung terbuka';
}
$('#lx-input').addEventListener('input', () => { lxSel = 0; renderLauncher(); });
$('#lx-input').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); lxSel = Math.min(lxItems.length - 1, lxSel + 1); renderLauncher(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); lxSel = Math.max(0, lxSel - 1); renderLauncher(); }
  else if (e.key === 'Enter') { e.preventDefault(); lxRun(lxSel); }
});
$('#lx-list').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  e.stopPropagation();
  lxSel = Number(li.dataset.i);
  renderLauncher();
  lxRun(lxSel);
});
renderLauncher();
renderTodos();
setInterval(() => { if ($('section[data-tab="calendar"]').classList.contains('active')) renderHolCd(); }, 30000);
