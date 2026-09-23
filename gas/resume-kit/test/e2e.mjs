// GAS モック上で、メニュー操作と同じ流れを最後まで実行する。
// 実行: node gas/resume-kit/test/e2e.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createGas } from './gas-mock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');
const code = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort().map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');

function boot() {
  const gas = createGas();
  const ctx = { ...gas.globals };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const ss = gas.createSpreadsheet('履歴書_作成用');
  gas.setActive(ss);
  ctx.setupSheets_(ss, true);
  return { gas, ctx, ss };
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }

console.log('setup');
test('サンプル投入 → エラーゼロ、再実行しても行が増えない', () => {
  const { gas, ctx, ss } = boot();
  const names = ss.getSheets().map((s) => s.getName());
  assert.deepEqual(names.slice(0, 3), ['基本情報', '学歴', '職歴']);
  assert.ok(!names.includes('シート1'));
  const errs = ctx.runChecks(ctx.loadModel(ss)).filter((r) => r.level === 'ERROR');
  assert.equal(errs.length, 0, JSON.stringify(errs));
  const before = ss.getSheetByName('基本情報').getLastRow();
  ctx.setupSheets_(ss, true);
  assert.equal(ss.getSheetByName('基本情報').getLastRow(), before);
  assert.equal(ss.getSheetByName('学歴').getLastRow(), 4);
});

console.log('標準レイアウトの生成');
test('保存先を名前で指定 → 氏名様ファイル名で Doc と PDF', () => {
  const { gas, ctx } = boot();
  gas.uiQueue.prompts.push('応募書類_2026');
  ctx.menuBuildBoth();
  const folder = [...gas.folders.values()].find((f) => f.name === '応募書類_2026');
  assert.ok(folder, '保存先フォルダが作られる: ' + gas.uiQueue.shown.join('\n'));
  const live = gas.liveFiles(folder.id).map((f) => `${f.name}|${f.mime}`).sort();
  assert.deepEqual(live, [
    '田中 太郎様_履歴書.pdf|application/pdf',
    '田中 太郎様_履歴書|application/vnd.google-apps.document',
    '田中 太郎様_職務経歴書.pdf|application/pdf',
    '田中 太郎様_職務経歴書|application/vnd.google-apps.document',
  ].sort());
  const rId = gas.liveFiles(folder.id).find((f) => f.name === '田中 太郎様_履歴書').id;
  const t = gas.docText(rId);
  for (const s of ['履　歴　書', '田中 太郎', 'たなか たろう', '1997年5月10日生', '〒 100-0001', '学歴・職歴（各別にまとめて書く）', '株式会社サンプル薬局 入社', '現在に至る', '以上', '普通自動車第一種運転免許 取得', '貴社の規定に従います。']) {
    assert.ok(t.includes(s), '履歴書に「' + s + '」');
  }
  const sId = gas.liveFiles(folder.id).find((f) => f.name === '田中 太郎様_職務経歴書').id;
  const st = gas.docText(sId);
  for (const s of ['職 務 経 歴 書', '■職務要約', '■活かせる経験・能力・知識・技術', '【課題解決力】', '2023年7月～現在', '案件', '社内AI推進・業務改善プロジェクト', '・在庫管理・発注業務を棚卸しし', '■自己PR', '以上']) {
    assert.ok(st.includes(s), '職務経歴書に「' + s + '」');
  }
  // 会社ブロックは 2 列表（結合なし）
  const tables = gas.docBody(sId).getTables();
  const company = tables.find((tb) => tb.getRow(0).getText().includes('株式会社サンプル薬局'));
  assert.ok(company.children.every((row) => row.getNumCells() === 2));
});
test('2 回目は空欄で前回フォルダ、古い PDF は置き換え', () => {
  const { gas, ctx } = boot();
  gas.uiQueue.prompts.push('応募書類');
  ctx.menuBuildRirekisho();
  gas.uiQueue.prompts.push('');
  ctx.menuBuildRirekisho();
  const folder = [...gas.folders.values()].find((f) => f.name === '応募書類');
  const pdfs = gas.liveFiles(folder.id).filter((f) => f.mime === 'application/pdf');
  assert.equal(pdfs.length, 1);
});
test('キャンセルなら何も作らない / 存在しない URL はエラー表示', () => {
  const { gas, ctx } = boot();
  gas.uiQueue.prompts.push(null);
  const n = gas.files.size;
  ctx.menuBuildRirekisho();
  assert.equal(gas.files.size, n);
  gas.uiQueue.prompts.push('https://drive.google.com/drive/folders/1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
  ctx.menuBuildRirekisho();
  assert.ok(gas.uiQueue.shown.some((m) => m.startsWith('生成できませんでした | フォルダが見つからない')), gas.uiQueue.shown.join('\n'));
});
test('ファイル名パターンに種別が無くても同名にならない', () => {
  const { gas, ctx, ss } = boot();
  const sh = ss.getSheetByName('設定');
  const vals = sh.getDataRange().getValues();
  const row = vals.findIndex((r) => r[0] === 'ファイル名パターン') + 1;
  sh.getRange(row, 2).setValue('{氏名}');
  gas.uiQueue.prompts.push('out');
  ctx.menuBuildBoth();
  const folder = [...gas.folders.values()].find((f) => f.name === 'out');
  const names = gas.liveFiles(folder.id).map((f) => f.name);
  assert.ok(names.includes('田中 太郎_履歴書') && names.includes('田中 太郎_職務経歴書'), names.join(','));
});

console.log('会社規定の用紙（ドキュメント）');
function jisLikeDoc(gas) {
  return gas.createDoc('会社用紙_履歴書', (body) => {
    body.appendParagraph('履歴書　　年　月　日現在');
    body.appendTable([
      ['ふりがな', ''], ['氏名', ''], ['生年月日', ''],
      ['ふりがな', ''], ['現住所', ''], ['電話', ''],
      ['ふりがな', ''], ['連絡先', ''], ['電話', ''],
    ]);
    body.appendTable([['年', '月', '学歴・職歴（各別にまとめて書く）'], ['', '', ''], ['', '', '']]);
    body.appendTable([['志望の動機、特技、好きな学科、アピールポイントなど'], ['']]);
    body.appendParagraph('■自己PR');
    body.appendParagraph('');
  });
}
function setSetting(ss, key, value) {
  const sh = ss.getSheetByName('設定');
  const row = sh.getDataRange().getValues().findIndex((r) => r[0] === key) + 1;
  sh.getRange(row, 2).setValue(value);
}
test('トークン自動挿入: 文脈でふりがなを振り分け、連絡先の電話は重複させない', () => {
  const { gas, ctx } = boot();
  const tpl = jisLikeDoc(gas);
  const n = ctx.autoInsertTokensDoc_(tpl);
  const t = gas.docText(tpl);
  assert.ok(n >= 9, 'inserted ' + n);
  for (const tk of ['{{ふりがな}}', '{{氏名}}', '{{生年月日}}', '{{現住所ふりがな}}', '{{現住所}}', '{{電話}}', '{{連絡先ふりがな}}', '{{連絡先}}', '{{学歴職歴_年}}', '{{学歴職歴_内容}}', '{{志望動機}}', '{{自己PR}}']) {
    assert.ok(t.includes(tk), tk + ' が入る\n' + t);
  }
  assert.equal(t.split('{{電話}}').length - 1, 1, '電話は 1 回だけ');
  assert.ok(!t.includes('履歴書　　年　月　日現在{{'), 'タイトルには入れない');
  assert.equal(ctx.classifyTokens_(t).missing.length, 0);
});
test('トークン入り用紙に流し込み: 行が件数分に増え、トークンが残らない', () => {
  const { gas, ctx, ss } = boot();
  const tpl = jisLikeDoc(gas);
  ctx.autoInsertTokensDoc_(tpl);
  setSetting(ss, '履歴書テンプレート', 'https://docs.google.com/document/d/' + tpl + '/edit');
  gas.uiQueue.prompts.push('tplout');
  ctx.menuBuildRirekisho();
  const folder = [...gas.folders.values()].find((f) => f.name === 'tplout');
  const out = gas.liveFiles(folder.id).find((f) => f.name === '田中 太郎様_履歴書');
  assert.ok(out, gas.uiQueue.shown.join('\n'));
  const t = gas.docText(out.id);
  assert.ok(!t.includes('{{'), t);
  for (const s of ['田中 太郎', 'たなか たろう', '1997年5月10日', 'とうきょうとちよだくちよだ', '同上', 'サンプル大学 薬学部 薬学科 卒業', '現在に至る', '医療現場で業務改善', '現場の業務構造を可視化']) assert.ok(t.includes(s), s + '\n' + t);
  const hist = gas.docBody(out.id).getTables()[1];
  const expected = ctx.buildTokenValues_(ctx.loadModel(ss)).lists['学歴職歴'].length;
  assert.equal(hist.getNumRows(), 1 + expected + 1, 'ヘッダ + 件数 + 元の空行');
  assert.equal(hist.getRow(2).getCell(2).getText(), 'サンプル高等学校 普通科 卒業');
  // 原本は変わらない
  assert.ok(gas.docText(tpl).includes('{{氏名}}'));
});
test('罫線の行数が決まった用紙: 上から埋め、足りない分だけ追加', () => {
  const { gas, ctx, ss } = boot();
  const rows = [['年', '月', '学歴・職歴']];
  for (let i = 0; i < 4; i++) rows.push(['{{学歴職歴_年}}', '{{学歴職歴_月}}', '{{学歴職歴_内容}}']);
  rows.push(['', '', '※ 記入欄の下']);
  const tpl = gas.createDoc('固定行', (b) => { b.appendParagraph('{{氏名}} $100 {{年齢}}'); b.appendTable(rows); });
  setSetting(ss, '履歴書テンプレート', tpl);
  gas.uiQueue.prompts.push('fixed');
  ctx.menuBuildRirekisho();
  const folder = [...gas.folders.values()].find((f) => f.name === 'fixed');
  const out = gas.liveFiles(folder.id).find((f) => f.mime.includes('document'));
  const table = gas.docBody(out.id).getTables()[0];
  const list = ctx.buildTokenValues_(ctx.loadModel(ss)).lists['学歴職歴'];
  assert.equal(table.getNumRows(), 1 + list.length + 1);
  assert.deepEqual(list.map((e, i) => table.getRow(i + 1).getCell(2).getText()), list.map((e) => e[2]));
  assert.equal(table.getRow(table.getNumRows() - 1).getCell(2).getText(), '※ 記入欄の下');
  assert.match(gas.docText(out.id), /^\n?田中 太郎 \$100 \d+/);
});
test('値に $ や \\ があっても文字どおり入る', () => {
  const { gas, ctx } = boot();
  const d = gas.createDoc('x', (b) => b.appendParagraph('A{{氏名}}B{{氏名}}C'));
  const body = gas.docBody(d);
  ctx.replaceLiteral_(body, '氏名', '$1 \\n {{氏名}}');
  assert.equal(body.getText().split('\n').pop(), 'A$1 \\n 氏名B$1 \\n 氏名C');
});

console.log('会社規定の用紙（スプレッドシート）');
test('単一行は下方向に展開、固定行は順に埋める、単一トークン置換', () => {
  const { gas, ctx, ss } = boot();
  const tplSs = gas.createSpreadsheet('会社用紙_xlsx相当', ['様式']);
  const sh = tplSs.getSheetByName('様式');
  sh.getRange(1, 1, 3, 3).setValues([
    ['氏名', '{{氏名}}', '{{作成日_年}}年'],
    ['年', '月', '学歴・職歴'],
    ['{{学歴職歴_年}}', '{{学歴職歴_月}}', '{{学歴職歴_内容}}'],
  ]);
  sh.getRange(20, 1, 2, 3).setValues([
    ['{{資格_年}}', '{{資格_月}}', '{{資格_内容}}'],
    ['{{資格_年}}', '{{資格_月}}', '{{資格_内容}}'],
  ]);
  setSetting(ss, '履歴書テンプレート', tplSs.getId());
  gas.uiQueue.prompts.push('xls');
  ctx.menuBuildRirekisho();
  const folder = [...gas.folders.values()].find((f) => f.name === 'xls');
  const out = gas.liveFiles(folder.id).find((f) => f.mime.includes('spreadsheet'));
  const g = gas.sheetGrid(out.id, '様式');
  assert.equal(g[0][1], '田中 太郎');
  assert.match(g[0][2], /^\d{4}年$/);
  assert.equal(g[2][2], '学歴');
  assert.equal(g[3][2], 'サンプル高等学校 普通科 卒業');
  assert.equal(g[19][2], '普通自動車第一種運転免許 取得');
  assert.equal(g[20][2], '薬剤師免許 取得');
  assert.equal(g[21][2], '一級小型船舶操縦士 取得', '固定 2 行を超えた分は下に続く');
  assert.ok(!JSON.stringify(g).includes('{{'));
});

console.log('AI 分析 → 提案 → 反映');
test('Gemini の返答を提案シートにし、チェックした行だけ反映。設定シートは拒否', () => {
  const { gas, ctx, ss } = boot();
  gas.props.set('GEMINI_API_KEY', 'test-key');
  const reply = {
    review: '数値実績は良い。一貫性の説明が弱い。',
    proposals: [
      { address: '文章!職務要約', current: '', proposed: '新しい職務要約。待ち時間60%削減。', reason: '冒頭に数値', priority: '高' },
      { address: '経験・能力!行3!本文', current: '', proposed: '業務改善力の新本文', reason: 'r', priority: '中' },
      { address: '設定!出力フォルダ', current: '', proposed: 'evil', reason: 'x', priority: '低' },
    ],
  };
  gas.setFetch((url, opt) => {
    assert.match(url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-pro:generateContent$/);
    assert.equal(opt.headers['x-goog-api-key'], 'test-key');
    const body = JSON.parse(opt.payload);
    assert.ok(body.contents[0].parts[0].text.includes('[文章!自己PR]'));
    return { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(reply) + '\n```' }] } }] }) };
  });
  ctx.menuAiAnalyze();
  const psh = ss.getSheetByName('AI提案');
  const rows = psh.getRange(4, 1, 3, 7).getValues();
  assert.deepEqual(rows.map((r) => r[6]), ['未反映', '未反映', '反映不可']);
  psh.getRange(4, 1).setValue(true);   // 職務要約だけ採用
  psh.getRange(6, 1).setValue(true);   // 設定シート（拒否されるはず）
  ctx.menuApplyProposals();
  const texts = ctx.loadModel(ss);
  assert.equal(texts.texts.summary, '新しい職務要約。待ち時間60%削減。');
  assert.notEqual(texts.skills.find((s) => s.row === 3).body, '業務改善力の新本文');
  assert.equal(texts.settings['出力フォルダ'], '');
  assert.deepEqual(psh.getRange(4, 7, 3, 1).getValues().map((r) => r[0]), ['反映済', '未反映', '反映不可']);
});
test('Claude に切り替え: fallbacks と beta ヘッダ付き、API エラーはメッセージ表示', () => {
  const { gas, ctx, ss } = boot();
  setSetting(ss, 'AIプロバイダ', 'claude');
  gas.props.set('ANTHROPIC_API_KEY', 'sk-ant-test');
  gas.setFetch((url, opt) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    const body = JSON.parse(opt.payload);
    assert.equal(body.model, 'claude-opus-5');
    assert.equal(body.fallbacks, 'default');
    assert.equal(opt.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
    return { code: 429, body: JSON.stringify({ error: { message: 'rate limited' } }) };
  });
  ctx.menuAiAnalyze();
  assert.ok(gas.uiQueue.shown.some((s) => s.includes('AI 分析 失敗')), gas.uiQueue.shown.join('\n'));
});

console.log('互換性');
test('v1.0 の設定名（出力フォルダID・AIモデル・接頭辞）を引き継ぐ: セットアップ再実行あり／なし', () => {
  for (const rerun of [false, true]) {
    const { ctx, ss } = boot();
    ss.deleteSheet(ss.getSheetByName('設定'));
    const sh = ss.insertSheet('設定');
    sh.getRange(1, 1, 4, 2).setValues([['項目', '値'], ['出力フォルダID', 'OLDID'], ['AIモデル', 'claude-sonnet-5'], ['ファイル名の接頭辞', 'KL_']]);
    if (rerun) ctx.setupSheets_(ss, false);
    const m = ctx.loadModel(ss);
    assert.equal(m.settings['出力フォルダ'], 'OLDID', 'rerun=' + rerun);
    assert.equal(m.settings['Claudeモデル'], 'claude-sonnet-5', 'rerun=' + rerun);
    assert.equal(ctx.outputFileName_(m, '履歴書'), 'KL_田中 太郎様_履歴書', 'rerun=' + rerun);
  }
});

console.log(`\n${passed} e2e tests passed`);
