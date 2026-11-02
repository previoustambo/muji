import { dateKey, parseDate, addDays, monthGrid, setRecord, calculateStats, validateBackup, makeBackup, STORAGE_KEY } from './model.mjs';

const icons = {
  leaf: '<path d="M20 3c-1 7-2 13-8 14-5 1-9-2-7-6S13 7 20 3Z"/><path d="M5 21c0-6 4-11 11-15"/>',
  sprout: '<path d="M12 22v-9M12 17C3 18 2 11 3 8c6-1 10 2 9 9ZM12 13c-1-7 3-11 9-11 1 6-2 11-9 11Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
  settings: '<path d="m10 3-.6 2.3-2 .9L5.2 6 3 9.8l1.6 1.7v2L3 15.2 5.2 19l2.2-.3 2 .9L10 22h4l.6-2.4 2-.9 2.2.3 2.2-3.8-1.6-1.7v-2L21 9.8 18.8 6l-2.2.2-2-.9L14 3Z" transform="translate(0 -1)"/><circle cx="12" cy="11.5" r="3"/>',
  moon: '<path d="M20.8 13A8.8 8.8 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0ZM7 21h10M9 2v5m4-4v4m4-5v5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  flame: '<path d="M12 2c3 5 0 6 4 9 1-2 1-3 1-4 4 4 5 8 2 12-4 5-13 4-15-2-2-5 2-10 4-12 0 4 1 5 2 5 2-2 3-5 2-8Z"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-2v4m-2-2h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
  share: '<path d="M8 8H5v13h14V8h-3M12 15V2m-4 4 4-4 4 4"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] ?? icons.leaf}</svg>`;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
$$('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });

let today = dateKey();
const initialDate = parseDate(today);
let viewedYear = initialDate.getFullYear(), viewedMonth = initialDate.getMonth();
let records = {}, storageBlocked = false, selectedDate = today, pendingImport = null, offlineReady = false;
let toastTimer;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) records = validateBackup(JSON.parse(saved));
} catch {
  storageBlocked = true;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast-text').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}

function showStorageError() {
  if ($('#storage-error')) return;
  const notice = document.createElement('div');
  notice.id = 'storage-error';
  notice.className = 'info-box';
  notice.setAttribute('role', 'alert');
  notice.textContent = '暂时无法读取本机记录，已暂停打卡以保护原数据。请检查 Safari 的存储设置，或到「我的」导入备份恢复。';
  $('#main').prepend(notice);
}

function saveRecords(updated, restoring = false) {
  if (storageBlocked && !restoring) {
    toast('请先恢复本机存储，或导入备份后再记录');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeBackup(updated)));
  } catch {
    toast('保存失败，请检查设备可用空间和 Safari 存储设置');
    return false;
  }
  records = updated;
  storageBlocked = false;
  $('#storage-error')?.remove();
  render();
  return true;
}

function record(key, status) {
  try {
    if (!saveRecords(setRecord(records, key, status, dateKey()))) return;
    $('#record-dialog').close();
    toast(status === null ? '已清除这一天的记录' : key === dateKey() ? '今天已记录，按自己的节奏来' : '已补记，统计也更新了');
  } catch (error) { toast(error.message); }
}

function formatted(key, options = { month: 'long', day: 'numeric' }) {
  return parseDate(key).toLocaleDateString('zh-CN', options);
}

function renderCalendar(target) {
  const isHome = target === '#home-calendar';
  const label = `${viewedYear}年 ${viewedMonth + 1}月`;
  const monthPrefix = `${viewedYear}-${String(viewedMonth + 1).padStart(2, '0')}`;
  const now = parseDate(today);
  const canForward = viewedYear < now.getFullYear() || (viewedYear === now.getFullYear() && viewedMonth < now.getMonth());
  $(target).innerHTML = `<div class="calendar-toolbar"><strong>${label}</strong><div class="calendar-controls"><button data-month-shift="-1" aria-label="上个月" ${viewedYear === 1900 && viewedMonth === 0 ? 'disabled' : ''}>${icon('left')}</button>${isHome ? '' : '<button class="this-month-button" data-current-month>本月</button>'}<button data-month-shift="1" aria-label="下个月" ${canForward ? '' : 'disabled'}>${icon('right')}</button></div></div><div class="weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(x => `<span>${x}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="${label}日历">${monthGrid(viewedYear, viewedMonth).map(({ key, day, inMonth }) => {
    const status = records[key];
    const future = key > today;
    const label = status === 'skipped' ? '未吃晚饭' : status === 'ate' ? '已吃晚饭' : future ? '未来日期' : '未记录';
    return `<button class="calendar-day ${status ?? ''} ${!inMonth ? 'outside' : ''} ${future ? 'future' : ''} ${key === today ? 'is-today' : ''}" data-date="${key}" aria-label="${formatted(key, { year: 'numeric', month: 'long', day: 'numeric' })}，${label}${key === today ? '，今天' : ''}" ${key === today ? 'aria-current="date"' : ''} ${future || !inMonth ? 'disabled' : ''}><span>${day}</span>${status && inMonth ? `<span class="day-symbol">${icon(status === 'skipped' ? 'check' : 'bowl')}</span>` : ''}</button>`;
  }).join('')}</div>`;
  if (!isHome) {
    $('#viewed-month-label').textContent = `${viewedYear}年${viewedMonth + 1}月`;
    const keys = Object.keys(records).filter(k => k.startsWith(monthPrefix));
    const skipped = keys.filter(k => records[k] === 'skipped').length;
    $('#viewed-month-stats').innerHTML = [['未吃晚饭', skipped], ['已吃晚饭', keys.length - skipped], ['已记录', keys.length]].map(([label, value]) => `<div class="month-detail-row"><span>${label}</span><strong>${value}<small>天</small></strong></div>`).join('');
  }
}

function renderToday() {
  const status = records[today];
  $('#today-date').textContent = formatted(today, { month: 'long', day: 'numeric', weekday: 'long' });
  $('#header-date').textContent = formatted(today, { month: 'numeric', day: 'numeric', weekday: 'short' });
  $('#record-title').textContent = status === 'skipped' ? '今晚，未吃晚饭。' : status === 'ate' ? '今晚，已吃晚饭。' : '今晚吃晚饭了吗？';
  $('#today-kicker').textContent = status ? '今天的状态，已经记好了' : '把今天的状态，轻轻记下';
  $('#today-description').textContent = status ? '每一条真实记录，都让你更了解自己的节奏。' : '选择你的真实状态，记录就从这一刻开始。';
  $('#record-skipped').classList.toggle('selected', status === 'skipped');
  $('#record-ate').classList.toggle('selected', status === 'ate');
  $('#record-skipped').setAttribute('aria-pressed', String(status === 'skipped'));
  $('#record-ate').setAttribute('aria-pressed', String(status === 'ate'));
  $('#edit-today').hidden = !status;
  const stats = calculateStats(records, today);
  $('#home-streak').textContent = stats.currentStreak;
  $('#home-best').textContent = stats.longestStreak;
  $('#streak-message').textContent = stats.currentStreak ? `已经连续记下 ${stats.currentStreak} 天，好好认识自己。` : '每一个记录，都是新的开始。';
  $('#home-month-skipped').textContent = stats.monthSkipped;
  $('#home-total-skipped').textContent = stats.skipped;
  $('#month-tag').textContent = `${parseDate(today).getMonth() + 1} 月`;
  $('#month-summary').textContent = `本月已记录 ${stats.monthTotal} 天 · 未记录不计入统计`;
  $('#month-progress-fill').style.width = `${stats.monthTotal ? stats.monthSkipped / stats.monthTotal * 100 : 0}%`;
  $('#week-strip').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6), status = records[key];
    const weekday = ['日','一','二','三','四','五','六'][parseDate(key).getDay()];
    return `<div class="week-day ${status ? 'recorded' : ''} ${status ?? ''}" title="${formatted(key)} · ${status === 'skipped' ? '未吃晚饭' : status === 'ate' ? '已吃晚饭' : '未记录'}"><span>${i === 6 ? '今' : weekday}</span><span>${status ? icon('check') : parseDate(key).getDate()}</span></div>`;
  }).join('');
}

function renderStats() {
  const stats = calculateStats(records, today);
  const cards = [
    ['累计未吃晚饭', stats.skipped, 'moon', '所有已记录的日期'],
    ['本月未吃晚饭', stats.monthSkipped, 'calendar', `${parseDate(today).getMonth() + 1}月的晚餐记录`],
    ['连续记录', stats.currentStreak, 'flame', '有记录就计入，不分晚餐状态'],
    ['最长连续记录', stats.longestStreak, 'sprout', `累计已记录 ${stats.total} 天`],
  ];
  $('#stats-cards').innerHTML = cards.map(([label, value, symbol, caption]) => `<article class="panel stat-card"><div class="stat-label">${label}${icon(symbol)}</div><div class="stat-value">${value}<small>天</small></div><p>${caption}</p></article>`).join('');
  const now = parseDate(today);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i - 5, 1, 12);
    const prefix = dateKey(date).slice(0, 7);
    return { label: `${date.getMonth() + 1}月`, full: `${date.getFullYear()}年${date.getMonth() + 1}月`, value: Object.keys(records).filter(k => k.startsWith(prefix) && records[k] === 'skipped').length };
  });
  const max = Math.max(5, ...months.map(x => x.value));
  $('#bar-chart').innerHTML = months.map(x => `<div class="bar-column"><div class="bar" style="height:${Math.max(1.5, x.value / max * 85)}%"><span class="bar-count">${x.value}</span></div><span class="bar-label">${x.label}</span></div>`).join('');
  $('#bar-chart').setAttribute('aria-label', months.map(x => `${x.full}未吃晚饭${x.value}天`).join('，'));
  $('#ratio-number').textContent = stats.ratio === null ? '—' : `${stats.ratio}%`;
  const percent = stats.total ? stats.skipped / stats.total * 100 : 0;
  $('#donut').style.background = stats.total ? `conic-gradient(#b59bd3 0% ${percent}%, #d9b3c5 ${percent}% 100%)` : '#f1eaf8';
  $('#distribution-legend').innerHTML = `<div class="distribution-row"><i class="legend-dot skipped"></i>未吃晚饭<strong>${stats.skipped} 天</strong></div><div class="distribution-row"><i class="legend-dot ate"></i>已吃晚饭<strong>${stats.ate} 天</strong></div>`;
  const recent = Object.keys(records).sort().reverse().slice(0, 8);
  $('#recent-records').innerHTML = recent.length ? recent.map(key => `<button class="recent-row" data-date="${key}"><span class="recent-icon ${records[key]}">${icon(records[key] === 'skipped' ? 'moon' : 'bowl')}</span><span><strong>${records[key] === 'skipped' ? '未吃晚饭' : '已吃晚饭'}</strong><small>${formatted(key, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</small></span><span>修改 ↗</span></button>`).join('') : '<div class="empty-state">还没有记录，日历等你慢慢填满。<a href="#today">记下今天的状态 →</a></div>';
}

function renderBackupNote() {
  try {
    const exported = localStorage.getItem(`${STORAGE_KEY}.exported`);
    if (exported && !Number.isNaN(new Date(exported).getTime())) $('#backup-note').textContent = `上次生成备份：${new Date(exported).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  } catch { /* Backup metadata is optional. */ }
}

function render() {
  today = dateKey();
  renderToday();
  renderCalendar('#home-calendar');
  renderCalendar('#full-calendar');
  renderStats();
  renderBackupNote();
}

function route() {
  const pages = ['today', 'calendar', 'stats', 'settings'];
  let page = location.hash.slice(1);
  if (!pages.includes(page)) page = 'today';
  $$('.page').forEach(section => { section.hidden = section.id !== `page-${page}`; });
  $$('[data-page]').forEach(link => {
    const active = link.dataset.page === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('#page-breadcrumb').textContent = ({ today: '今日记录', calendar: '打卡日历', stats: '统计趋势', settings: '设置与备份' })[page];
  document.title = `暮记 · ${{ today: '晚餐打卡', calendar: '打卡日历', stats: '统计趋势', settings: '设置与备份' }[page]}`;
  window.scrollTo(0, 0);
}

function openRecord(key) {
  if (key > dateKey() || !parseDate(key)) return;
  selectedDate = key;
  $('#dialog-title').textContent = formatted(key, { month: 'long', day: 'numeric', weekday: 'long' });
  $('#dialog-description').textContent = key === dateKey() ? '记下今晚的晚餐状态。' : '补记或修改这一天，统计会自动更新。';
  $$('.dialog-options button').forEach(button => {
    const selected = button.dataset.status === records[key];
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#clear-record').hidden = !records[key];
  $('#record-dialog').showModal();
}

$('#record-skipped').addEventListener('click', () => record(dateKey(), 'skipped'));
$('#record-ate').addEventListener('click', () => record(dateKey(), 'ate'));
$('#edit-today').addEventListener('click', () => openRecord(dateKey()));
$('#clear-record').addEventListener('click', () => record(selectedDate, null));
$$('[data-status]').forEach(button => button.addEventListener('click', () => record(selectedDate, button.dataset.status)));

function resetMonth() {
  const now = new Date();
  viewedYear = now.getFullYear(); viewedMonth = now.getMonth();
  render();
}
document.addEventListener('click', event => {
  const day = event.target.closest('[data-date]');
  if (day && !day.disabled) openRecord(day.dataset.date);
  const month = event.target.closest('[data-month-shift]');
  if (month && !month.disabled) {
    const next = new Date(viewedYear, viewedMonth + Number(month.dataset.monthShift), 1, 12);
    viewedYear = next.getFullYear(); viewedMonth = next.getMonth();
    renderCalendar('#home-calendar'); renderCalendar('#full-calendar');
  }
  if (event.target.closest('[data-current-month]')) resetMonth();
});
$('#calendar-today').addEventListener('click', resetMonth);
window.addEventListener('hashchange', route);

$('#export-data').addEventListener('click', async () => {
  if (storageBlocked) return toast('当前记录读取失败，请先恢复本机存储');
  const filename = `暮记备份-${dateKey()}.json`;
  const blob = new Blob([JSON.stringify(makeBackup(records), null, 2)], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '暮记记录备份' });
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    }
    try { localStorage.setItem(`${STORAGE_KEY}.exported`, new Date().toISOString()); } catch { /* Optional metadata. */ }
    renderBackupNote();
    toast('备份已生成，请保存到「文件」中');
  } catch (error) {
    if (error.name !== 'AbortError') toast('暂时无法导出，请重试');
  }
});

$('#import-data').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return toast('文件过大，请选择小于 2 MB 的暮记备份');
  try {
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new Error('无法解析文件，请选择暮记导出的 JSON 备份'); }
    pendingImport = validateBackup(data);
    $('#confirm-message').textContent = `备份包含 ${Object.keys(pendingImport).length} 天记录，将替换当前设备的 ${Object.keys(records).length} 天记录。建议先导出当前记录作为备份。`;
    $('#confirm-dialog').showModal();
  } catch (error) { pendingImport = null; toast(error.message); }
});
function cancelImport() { pendingImport = null; $('#confirm-dialog').close(); }
$('#cancel-import').addEventListener('click', cancelImport);
$('#cancel-import-x').addEventListener('click', cancelImport);
$('#confirm-dialog').addEventListener('cancel', () => { pendingImport = null; });
$('#confirm-import').addEventListener('click', () => {
  if (pendingImport === null) return;
  if (!saveRecords(pendingImport, true)) return;
  pendingImport = null; $('#confirm-dialog').close(); toast('记录已恢复，统计已更新');
});

function connectionStatus() {
  $('#connection-state').hidden = navigator.onLine;
  $('#connection-state').textContent = offlineReady ? '离线可用' : '当前离线';
}
window.addEventListener('online', connectionStatus);
window.addEventListener('offline', connectionStatus);
connectionStatus();

async function prepareOffline() {
  if (!('serviceWorker' in navigator)) {
    $('#install-status').textContent = '此浏览器暂不支持离线使用，请联网打开暮记。';
    return;
  }
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    offlineReady = true;
    $('#install-status').textContent = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? '已在 App 模式运行 · 离线资源已准备好。' : '离线资源已准备好，添加到主屏幕后即可随手记录。';
    connectionStatus();
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    $('#install-status').textContent = '离线资源暂未准备好，请保持联网，稍后重新打开。';
  }
}

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  try {
    records = event.newValue ? validateBackup(JSON.parse(event.newValue)) : {};
    storageBlocked = false; $('#storage-error')?.remove(); render();
  } catch { storageBlocked = true; showStorageError(); }
});
function refreshDate() {
  const newToday = dateKey();
  if (newToday !== today) {
    today = newToday;
    resetMonth();
    if ($('#record-dialog').open) $('#record-dialog').close();
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDate(); });
window.addEventListener('focus', refreshDate);
setInterval(refreshDate, 30000);
render(); route();
if (storageBlocked) showStorageError();
prepareOffline();
