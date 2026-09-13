// GAS を使わずに純粋ロジック（Util / Data / Check / compose）を検証する。
// 実行: node gas/resume-kit/test/run-tests.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');
const code = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort()
  .map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');

// GAS サービスの最小モック（compose 系まで。DocumentApp を使う render は対象外）
const ctx = {
  console,
  SpreadsheetApp: { newDataValidation: () => ({ requireValueInList: () => ({ setAllowInvalid: () => ({ build: () => ({}) }) }) }) },
  PropertiesService: {}, UrlFetchApp: {}, DriveApp: {}, DocumentApp: {}
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

// ---- サンプルデータをシートとして再現する Spreadsheet モック
function kvRows(keys, sample) {
  return [['項目', '値', '説明']].concat(keys.map((k) => [k[0], sample && sample[k[0]] !== undefined ? sample[k[0]] : k[1], k[2]]));
}
function makeSS(overrides = {}) {
  const K = ctx.KL;
  const tables = ctx.sampleTables_();
  const sheets = {
    [K.SHEET.BASIC]: kvRows(K.BASIC_KEYS, ctx.sampleBasic_()),
    [K.SHEET.TEXTS]: kvRows(K.TEXT_KEYS, ctx.sampleTexts_()),
    [K.SHEET.SETTINGS]: kvRows(K.SETTING_KEYS, null),
  };
  for (const name of Object.keys(tables)) sheets[name] = [K.HEADERS[name], ...tables[name]];
  Object.assign(sheets, overrides);
  return {
    getSheetByName: (name) => sheets[name] ? { getDataRange: () => ({ getValues: () => sheets[name].map((r) => r.slice()) }) } : null,
  };
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

console.log('Util');
test('toHankaku / toInt', () => {
  assert.equal(ctx.toHankaku_('２０２３年'), '2023年');
  assert.equal(ctx.toInt_('２０２３'), 2023);
  assert.equal(ctx.toInt_(''), null);
  assert.equal(ctx.toInt_(7), 7);
});
test('parseDate 各形式', () => {
  for (const s of ['1997-05-10', '1997/5/10', '1997年5月10日', '19970510']) {
    const d = ctx.parseDate_(s);
    assert.equal(ctx.formatIsoDate_(d), '1997-05-10', s);
  }
  assert.equal(ctx.parseDate_('abc'), null);
});
test('calcAge 誕生日前後', () => {
  const b = new Date(1997, 4, 10);
  assert.equal(ctx.calcAge_(b, new Date(2026, 4, 9)), 28);
  assert.equal(ctx.calcAge_(b, new Date(2026, 4, 10)), 29);
});
test('formatPeriod / hasWareki / withAcquired', () => {
  assert.equal(ctx.formatPeriod_(2023, 7, null, null), '2023年7月～現在');
  assert.equal(ctx.formatPeriod_(2023, 4, 2023, 6), '2023年4月～2023年6月');
  assert.equal(ctx.hasWareki_('平成29年入学'), true);
  assert.equal(ctx.hasWareki_('2017年入学'), false);
  assert.equal(ctx.withAcquired_('薬剤師免許'), '薬剤師免許 取得');
  assert.equal(ctx.withAcquired_('TOEIC 800点 取得'), 'TOEIC 800点 取得');
});

console.log('Data + Check');
test('サンプルデータは ERROR ゼロ', () => {
  const model = ctx.loadModel(makeSS());
  assert.equal(model.basic['氏名'], '田中 太郎');
  assert.equal(model.jobs.length, 2);
  assert.equal(model.projects.length, 3);
  const results = ctx.runChecks(model);
  const errors = results.filter((r) => r.level === 'ERROR');
  assert.equal(errors.length, 0, JSON.stringify(errors, null, 1));
});
test('雇用形態未入力・会社名不一致・空白期間を検出', () => {
  const K = ctx.KL;
  const jobs = [K.HEADERS[K.SHEET.JOBS],
    ['2023', '4', '2023', '6', '株式会社A', '', '', '', '', '', '', '', ''],
    ['2023', '10', '', '', '株式会社B', '正社員', '', '', '', '', '', '', '']];
  const projects = [K.HEADERS[K.SHEET.PROJECTS], ['株式会社C', 'P', '2024', '1', '', '', '', '概要', 'a', '10%']];
  const model = ctx.loadModel(makeSS({ [K.SHEET.JOBS]: jobs, [K.SHEET.PROJECTS]: projects }));
  const msgs = ctx.runChecks(model).map((r) => r.level + ':' + r.item + ':' + r.message);
  assert.ok(msgs.some((m) => m.startsWith('ERROR:株式会社A:雇用形態')), msgs.join('\n'));
  assert.ok(msgs.some((m) => m.includes('株式会社C」が職歴シートにありません')));
  assert.ok(msgs.some((m) => m.includes('3ヶ月の空白')), msgs.join('\n'));
});
test('Date セル・全角数字でも読める', () => {
  const K = ctx.KL;
  const basic = kvRows(K.BASIC_KEYS, Object.assign(ctx.sampleBasic_(), { '生年月日': new Date(1997, 4, 10), '作成日': '２０２６-０９-１３' }));
  const model = ctx.loadModel(makeSS({ [K.SHEET.BASIC]: basic }));
  assert.equal(ctx.formatIsoDate_(model.birth), '1997-05-10');
  assert.equal(ctx.formatIsoDate_(model.asOf), '2026-09-13');
  assert.equal(model.age, 29);
});

console.log('compose');
test('履歴書: 学歴→職歴→現在に至る→以上、行数パディング', () => {
  const model = ctx.loadModel(makeSS());
  const d = ctx.composeRirekisho_(model);
  const texts = d.historyRows.map((r) => r.text);
  assert.equal(texts[0], '学歴');
  assert.equal(texts[1], 'サンプル高等学校 普通科 卒業');
  const jobIdx = texts.indexOf('職歴');
  assert.ok(jobIdx > 0);
  assert.equal(texts[jobIdx + 1], '株式会社サンプルドラッグ 入社');
  assert.equal(texts[jobIdx + 2], '株式会社サンプルドラッグ 一身上の都合により退社');
  assert.equal(texts[jobIdx + 3], '株式会社サンプル薬局 入社');
  assert.equal(texts[jobIdx + 4], '現在に至る');
  assert.equal(texts[jobIdx + 5], '以上');
  assert.equal(d.historyRows[jobIdx + 5].align, 'right');
  assert.ok(d.historyRows.length >= ctx.KL.MIN_HISTORY_ROWS);
  assert.equal(d.licenseRows[0].text, '普通自動車第一種運転免許 取得');
  assert.equal(d.licenseRows.filter((r) => r.text).length, 3, '履歴書に載せる○のみ');
  assert.equal(d.contact, '同上');
  assert.match(d.birthLine, /^1997年5月10日生（満 \d+ 歳）$/);
});
test('履歴書: 正社員以外は雇用形態を明記', () => {
  const K = ctx.KL;
  const jobs = [K.HEADERS[K.SHEET.JOBS], ['2020', '4', '2021', '3', '株式会社X', '契約社員', '', '契約期間満了により退社', '', '', '', '', '']];
  const d = ctx.composeRirekisho_(ctx.loadModel(makeSS({ [K.SHEET.JOBS]: jobs })));
  const texts = d.historyRows.map((r) => r.text);
  assert.ok(texts.includes('株式会社X 契約社員として入社'), texts.join('|'));
  assert.ok(texts.includes('株式会社X 契約期間満了により退社'));
  assert.ok(!texts.includes('現在に至る'));
});
test('職務経歴書: 新しい順、会社ごとにプロジェクト、5要素からの本文生成', () => {
  const model = ctx.loadModel(makeSS());
  const d = ctx.composeShokumu_(model);
  assert.equal(d.jobRows[0][1], '株式会社サンプル薬局');
  assert.equal(d.jobRows[0][0], '2023年7月～現在');
  assert.equal(d.jobRows[1][2], '正社員（OTC部門 薬剤師）');
  assert.equal(d.companies.length, 2);
  assert.equal(d.companies[0].projects.length, 2);
  assert.equal(d.companies[0].projects[0].name, '社内AI推進・業務改善プロジェクト');
  assert.ok(d.companies[0].projects[0].overview.includes('【支援内容】'));
  assert.ok(d.companies[0].projects[0].overview.some((l) => l.startsWith('・')));
  assert.ok(d.companies[0].info.some((l) => l.startsWith('従業員数：')));
  assert.equal(d.skills[0].lines[0].slice(0, 7), '【ミッション】');
  assert.equal(d.licenseGroups.map((g) => g.title).join(','), '免許・資格,ツール・技術');
  assert.equal(d.achievementGroups[0].title, '登壇');
});
test('AI添削プロンプトに社内ルールと入力が含まれる', () => {
  const p = ctx.buildReviewPrompt_(ctx.loadModel(makeSS()));
  assert.ok(p.includes('再現性'));
  assert.ok(p.includes('株式会社サンプル薬局'));
  assert.ok(p.includes('## 自己PR'));
});

console.log(`\n${passed} tests passed`);
