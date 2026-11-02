export const BACKUP_VERSION = 1;
export const STORAGE_KEY = 'muji.evening.v1';
export const VALID_STATUSES = ['skipped', 'ate'];

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (y < 1900 || y > 9999) return null;
  const value = new Date(y, m - 1, d, 12);
  return dateKey(value) === key ? value : null;
}

export function addDays(key, days) {
  const value = parseDate(key);
  if (!value) throw new Error('无效日期');
  value.setDate(value.getDate() + days);
  return dateKey(value);
}

export function monthGrid(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + length) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const date = new Date(year, month, i - offset + 1, 12);
    return { key: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

export function setRecord(records, key, status, today = dateKey()) {
  if (!parseDate(key) || key > today) throw new Error('只能记录今天或过去的日期');
  if (status !== null && !VALID_STATUSES.includes(status)) throw new Error('无效记录状态');
  const updated = { ...records };
  if (status === null) delete updated[key];
  else updated[key] = status;
  return updated;
}

export function calculateStats(records, today = dateKey()) {
  const keys = Object.keys(records).filter(k => parseDate(k) && k <= today && VALID_STATUSES.includes(records[k])).sort();
  const skipped = keys.filter(k => records[k] === 'skipped');
  let cursor = records[today] ? today : addDays(today, -1);
  let currentStreak = 0;
  while (records[cursor] && VALID_STATUSES.includes(records[cursor])) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  let longestStreak = 0, run = 0, previous = null;
  for (const key of keys) {
    run = previous && addDays(previous, 1) === key ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = key;
  }
  const monthKeys = keys.filter(k => k.slice(0, 7) === today.slice(0, 7));
  return {
    total: keys.length, skipped: skipped.length, ate: keys.length - skipped.length,
    ratio: keys.length ? Math.round(skipped.length / keys.length * 100) : null,
    monthSkipped: monthKeys.filter(k => records[k] === 'skipped').length,
    monthTotal: monthKeys.length, currentStreak, longestStreak, firstRecord: keys[0] ?? null,
  };
}

export function validateBackup(value, today = dateKey()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'muji' || value.version !== BACKUP_VERSION) {
    throw new Error('这不是有效的暮记备份文件');
  }
  const source = value.records;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('备份中的记录格式不正确');
  if (Object.keys(source).length > 100000) throw new Error('备份记录过多');
  const records = {};
  for (const [key, status] of Object.entries(source)) {
    if (!parseDate(key) || key > today || !VALID_STATUSES.includes(status)) {
      throw new Error('备份包含无效日期、未来日期或未知状态');
    }
    records[key] = status;
  }
  return records;
}

export function makeBackup(records) {
  return { app: 'muji', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), records };
}
