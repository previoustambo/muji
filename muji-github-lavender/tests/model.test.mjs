import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dateKey, parseDate, addDays, monthGrid, setRecord, calculateStats, validateBackup, makeBackup } from '../model.mjs';

test('日期解析拒绝溢出、无效闰日和未知格式', () => {
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '26-01-01', '2026-1-01', '__proto__', '1899-01-01', null]) assert.equal(parseDate(invalid), null);
  assert.equal(dateKey(parseDate('2024-02-29')), '2024-02-29');
});

test('日期运算支持闰日、跨月与跨年', () => {
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('同一瞬间按设备本地日期记录，不按 UTC 截断', () => {
  const moduleURL = new URL('../model.mjs', import.meta.url).href;
  const script = `import { dateKey } from ${JSON.stringify(moduleURL)}; process.stdout.write(dateKey(new Date('2026-11-01T16:30:00Z')))`;
  for (const [TZ, expected] of [['Asia/Shanghai', '2026-11-02'], ['America/New_York', '2026-11-01']]) {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(output, expected);
  }
});

test('跨夏令时按自然日递进，连续天数不受时差影响', () => {
  const moduleURL = new URL('../model.mjs', import.meta.url).href;
  const script = `import { addDays, calculateStats } from ${JSON.stringify(moduleURL)}; process.stdout.write(JSON.stringify([addDays('2026-03-08',1),calculateStats({'2026-03-07':'ate','2026-03-08':'skipped','2026-03-09':'ate'},'2026-03-09').currentStreak]))`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), ['2026-03-09', 3]);
});

test('月历按周一开始，包含完整的闰年二月', () => {
  const grid = monthGrid(2024, 1);
  assert.equal(grid[0].key, '2024-01-29');
  assert.equal(grid.length % 7, 0);
  assert.equal(grid.filter(x => x.inMonth).length, 29);
  assert.equal(grid.filter(x => x.inMonth).at(-1).key, '2024-02-29');
  assert.equal(monthGrid(2026, 10).length, 42);
});

test('今日和历史记录可新增、修改与清除，未来不可记录', () => {
  const original = { '2026-11-01': 'ate' };
  const updated = setRecord(original, '2026-11-01', 'skipped', '2026-11-02');
  assert.equal(updated['2026-11-01'], 'skipped');
  assert.equal(original['2026-11-01'], 'ate');
  assert.deepEqual(setRecord(updated, '2026-11-01', null, '2026-11-02'), {});
  assert.throws(() => setRecord({}, '2026-11-03', 'skipped', '2026-11-02'));
  assert.throws(() => setRecord({}, '2026-11-01', 'unknown', '2026-11-02'));
});

test('无数据不显示错误占比，未记录日期不进入分母', () => {
  assert.equal(calculateStats({}, '2026-11-02').ratio, null);
  const stats = calculateStats({ '2026-10-01': 'skipped', '2026-11-01': 'ate', '2026-11-02': 'skipped' }, '2026-11-02');
  assert.equal(stats.total, 3);
  assert.equal(stats.skipped, 2);
  assert.equal(stats.ate, 1);
  assert.equal(stats.ratio, 67);
  assert.equal(stats.monthSkipped, 1);
  assert.equal(stats.monthTotal, 2);
});

test('今日未记录时保留截至昨天的连续天数；两种状态都算记录', () => {
  const records = { '2026-10-30': 'ate', '2026-10-31': 'skipped', '2026-11-01': 'ate' };
  assert.equal(calculateStats(records, '2026-11-02').currentStreak, 3);
  assert.equal(calculateStats(records, '2026-11-03').currentStreak, 0);
});

test('补记填补中断并重新计算，清除后连续天数正确中断', () => {
  const records = { '2026-10-30': 'skipped', '2026-11-01': 'ate', '2026-11-02': 'skipped' };
  assert.equal(calculateStats(records, '2026-11-02').currentStreak, 2);
  const backfilled = setRecord(records, '2026-10-31', 'ate', '2026-11-02');
  assert.equal(calculateStats(backfilled, '2026-11-02').currentStreak, 4);
  assert.equal(calculateStats(backfilled, '2026-11-02').longestStreak, 4);
  assert.equal(calculateStats(setRecord(backfilled, '2026-11-01', null, '2026-11-02'), '2026-11-02').currentStreak, 1);
});

test('备份可往返恢复，拒绝未来日期、未知版本和污染键', () => {
  const records = { '2026-11-01': 'ate', '2026-11-02': 'skipped' };
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(makeBackup(records))), '2026-11-02'), records);
  for (const bad of [null, [], {}, { app:'muji',version:2,records:{} }, { app:'muji',version:1,records:[] }, {app:'muji',version:1,records:{'2026-11-03':'ate'}}, {app:'muji',version:1,records:{'2026-11-01':'unknown'}}, JSON.parse('{"app":"muji","version":1,"records":{"__proto__":"ate"}}')]) assert.throws(() => validateBackup(bad, '2026-11-02'));
});
