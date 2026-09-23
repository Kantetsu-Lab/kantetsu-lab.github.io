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

// 保存先 X の中の「田中 太郎様」フォルダー
function outFolder(gas, parentName, person = '田中 太郎様') {
  const parent = [...gas.folders.values()].find((f) => f.name === parentName);
  if (!parent) return undefined;
  return [...gas.folders.values()].find((f) => f.parent === parent.id && f.name === person);
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
  const folder = outFolder(gas, '応募書類_2026');
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
  const folder = outFolder(gas, '応募書類');
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
  const folder = outFolder(gas, 'out');
  const names = gas.liveFiles(folder.id).map((f) => f.name);
  assert.ok(names.includes('田中 太郎_履歴書') && names.includes('田中 太郎_職務経歴書'), names.join(','));
});

test('会社フッター: 職務経歴書・推薦書の標準レイアウトに入り、履歴書には入れない', () => {
  const { gas, ctx, ss } = boot();
  setSetting(ss, '会社フッター', 'サンプル人材株式会社\n有料職業紹介事業 00-000000');
  const logo = gas.addRawFile('logo.png', 'image/png', null);
  setSetting(ss, '会社ロゴファイルID', logo);
  gas.uiQueue.prompts.push('footer');
  ctx.menuBuildAll();
  const files = gas.liveFiles(outFolder(gas, 'footer').id).filter((f) => f.mime.includes('document'));
  const by = (k) => files.find((f) => f.name.endsWith(k)).id;
  for (const k of ['職務経歴書', '推薦書']) {
    const f = gas.docFooter(by(k));
    assert.ok(f && f.getText().startsWith('サンプル人材株式会社\n有料職業紹介事業 00-000000'), k);
    assert.equal(f.paragraphs().reduce((n, p) => n + p.images, 0), 1, k + ' ロゴ');
  }
  assert.ok(!gas.docFooter(by('履歴書')), '履歴書は本人の書類なので入れない');
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
  const folder = outFolder(gas, 'tplout');
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
  const folder = outFolder(gas, 'fixed');
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
  const folder = outFolder(gas, 'xls');
  const out = gas.liveFiles(folder.id).find((f) => f.mime.includes('spreadsheet'));
  const g = gas.sheetGrid(out.id, '様式');
  assert.equal(g[0][1], '田中 太郎');
  assert.match(g[0][2], /^\d{4}年$/);
  assert.equal(g[2][2], '学歴');
  assert.equal(g[3][2], 'サンプル高等学校 普通科 卒業');
  assert.equal(g[19][2], '普通自動車第一種運転免許 取得');
  assert.equal(g[20][2], '薬剤師免許 取得');
  assert.equal(g[21] ? g[21][2] || '' : '', '', '固定 2 行を超えた分は書かない');
  assert.ok(gas.uiQueue.shown.some((m) => m.includes('資格 の欄が 1 行足りません')), gas.uiQueue.shown.join('\n'));
  const exp = gas.fetchLog.find((f) => /spreadsheets\/d\/.+\/export\?format=pdf/.test(f.url));
  assert.ok(exp && /portrait=true/.test(exp.url) && /fitw=true/.test(exp.url) && /gridlines=false/.test(exp.url), 'スプレッドシートの PDF は書き出し URL で');
  assert.ok(!JSON.stringify(g).includes('{{'));
});

test('見開きの用紙: 左の表を上から埋めて右の表へ続き、名称と区分を別の欄に書く', () => {
  const { gas, ctx, ss } = boot();
  const book = gas.createSpreadsheet('見開き履歴書', ['履歴書']);
  const sh = book.getSheetByName('履歴書');
  // 右（H〜K 列）の続きの表は上（5〜10 行）、左（B〜E 列）の表は下（20〜25 行）にある
  sh.getRange(19, 2, 1, 4).setValues([['年', '月', '学歴・職歴', '']]);
  sh.getRange(4, 8, 1, 4).setValues([['年', '月', '学歴・職歴', '']]);
  const slot = ['{{学歴職歴_年}}', '{{学歴職歴_月}}', '{{学歴職歴_名称}}', '{{学歴職歴_区分}}'];
  for (let i = 0; i < 6; i++) sh.getRange(20 + i, 2, 1, 4).setValues([slot]);
  for (let i = 0; i < 6; i++) sh.getRange(5 + i, 8, 1, 4).setValues([slot]);
  sh.getRange(26, 2, 1, 4).setValues([['', '', '（左の表の下）', '']]);
  setSetting(ss, '履歴書テンプレート', book.getId());
  gas.uiQueue.prompts.push('spread');
  ctx.menuBuildRirekisho();
  const out = gas.liveFiles(outFolder(gas, 'spread').id).find((f) => f.mime.includes('spreadsheet'));
  const g = gas.sheetGrid(out.id, '履歴書');
  const left = [0, 1, 2, 3, 4, 5].map((i) => g[19 + i].slice(1, 5));
  const right = [0, 1, 2, 3, 4, 5].map((i) => g[4 + i].slice(7, 11));
  assert.deepEqual(left[0], ['', '', '学歴', '']);
  assert.deepEqual(left[1], ['2016', '3', 'サンプル高等学校 普通科', '卒業']);
  assert.deepEqual(left[4], ['', '', '職歴', '']);
  assert.deepEqual(left[5], ['2023', '4', '株式会社サンプルドラッグ', '入社']);
  assert.deepEqual(right[0], ['2023', '6', '株式会社サンプルドラッグ', '一身上の都合により退社']);
  assert.deepEqual(right[1], ['2023', '7', '株式会社サンプル薬局', '入社']);
  assert.deepEqual(right[2], ['', '', '現在に至る', '']);
  assert.deepEqual(right[3], ['', '', '', '以上']);
  assert.deepEqual(right[5], ['', '', '', '']);
  assert.equal(g[25][3], '（左の表の下）', '表の外は触らない');
  const al = gas.sheetAlign(out.id, '履歴書');
  assert.equal(al['20,4'], 'center', '見出し「学歴」は中央揃え');
  assert.equal(al['21,4'], undefined);
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

console.log('新規候補者・添付・取り込み');
const MIME = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  SLIDES: 'application/vnd.google-apps.presentation',
};
function newCandidate(gas, ctx, name = '山田 花子', parent = 'クライアントA') {
  gas.uiQueue.prompts.push(name, parent);
  ctx.menuNewCandidate();
  const folder = outFolder(gas, parent, name + '様');
  assert.ok(folder, gas.uiQueue.shown.join('\n'));
  const sheetRec = gas.liveFiles(folder.id).find((f) => f.name === name + '様_入力シート');
  assert.ok(sheetRec, '入力シートが〇〇様フォルダーにある');
  return { folder, sheetId: sheetRec.id };
}
function kv(ss, sheet, key) {
  const row = ss.getSheetByName(sheet).getDataRange().getValues().find((r) => r[0] === key);
  return row ? row[1] : undefined;
}
test('新規作成: 〇〇様フォルダー・添付資料・空の入力シート（設定と推薦者は引き継ぐ）', () => {
  const { gas, ctx, ss } = boot();
  setSetting(ss, '職務経歴書テンプレート', 'TPLID0000000000000000000000000');
  const { folder, sheetId } = newCandidate(gas, ctx);
  const attach = [...gas.folders.values()].find((f) => f.parent === folder.id && f.name === '添付資料');
  assert.ok(attach);
  const cs = gas.globals.SpreadsheetApp.openById(sheetId);
  assert.equal(kv(cs, '基本情報', '氏名'), '山田 花子');
  assert.equal(kv(cs, '基本情報', '現住所'), '');
  assert.equal(kv(cs, '基本情報', '本人希望記入欄'), '貴社の規定に従います。');
  assert.equal(cs.getSheetByName('学歴').getLastRow(), 1);
  assert.equal(cs.getSheetByName('職歴').getLastRow(), 1);
  assert.equal(kv(cs, '文章', '職務要約'), '');
  assert.equal(kv(cs, '推薦書', '推薦文'), '');
  assert.equal(kv(cs, '推薦書', '推薦者会社'), 'サンプル人材株式会社');
  assert.equal(kv(cs, '設定', '出力フォルダ'), folder.id);
  assert.equal(kv(cs, '設定', '添付フォルダ'), attach.id);
  assert.equal(kv(cs, '設定', '職務経歴書テンプレート'), 'TPLID0000000000000000000000000');
  // 同じ名前でもう一度 → 既存を返す（重複しない）
  const n = gas.files.size;
  gas.uiQueue.prompts.push('山田 花子', 'クライアントA');
  ctx.menuNewCandidate();
  assert.equal(gas.files.size, n);
  assert.ok(gas.uiQueue.shown.some((m) => m.startsWith('既にあります')));
});
test('候補者シートから新規作成しても〇〇様の中に入れ子にならない', () => {
  const { gas, ctx } = boot();
  const { sheetId } = newCandidate(gas, ctx);
  gas.setActive(gas.globals.SpreadsheetApp.openById(sheetId));
  gas.uiQueue.prompts.push('鈴木 一郎', '');
  ctx.menuNewCandidate();
  const parent = [...gas.folders.values()].find((f) => f.name === 'クライアントA');
  assert.ok([...gas.folders.values()].some((f) => f.parent === parent.id && f.name === '鈴木 一郎様'), '空欄なら親の「クライアントA」に並ぶ');
  assert.ok(gas.uiQueue.shown.includes('PROMPT 「鈴木 一郎様」フォルダーを作る場所'), '保存先が設定済みでも作成場所は必ず聞く');
  // 任意のフォルダーを指定
  gas.uiQueue.prompts.push('佐々木 次郎', 'クライアントB');
  ctx.menuNewCandidate();
  assert.ok(outFolder(gas, 'クライアントB', '佐々木 次郎様'));
});

function candidateWithAttachments() {
  const { gas, ctx } = boot();
  const { folder, sheetId } = newCandidate(gas, ctx);
  const cs = gas.globals.SpreadsheetApp.openById(sheetId);
  gas.setActive(cs);
  ctx.menuAttach();
  assert.ok(gas.uiQueue.dialogs[0].html.includes('uploadAttachment'), 'アップロードダイアログ');
  // PC からアップロード（ファイル・フォルダー）
  const b64 = (t) => Buffer.from(t).toString('base64');
  assert.equal(ctx.uploadAttachment({ name: '旧職務経歴書.pdf', mime: 'application/pdf', data: b64('%PDF-1.4 fake'), path: '' }), '旧職務経歴書.pdf');
  ctx.uploadAttachment({ name: '面談メモ.txt', mime: 'text/plain', data: b64('転職理由: 医療DXに広く関わりたい。希望年収600万円。'), path: '面談/2026-09/面談メモ.txt' });
  // ドライブ上のファイル・フォルダー
  const docx = gas.addRawFile('履歴書_旧.docx', MIME.DOCX, null, { convertText: '氏名 山田 花子 生年月日 1995年4月1日' });
  const drv = gas.globals.DriveApp.getRootFolder().createFolder('スキルシート');
  const xlsx = gas.addRawFile('スキル.xlsx', MIME.XLSX, drv.getId(), { convertText: 'Python\t3年' });
  const slides = gas.addRawFile('ポートフォリオ', MIME.SLIDES, drv.getId());
  const n = ctx.addDriveAttachments('https://drive.google.com/file/d/' + docx + '/view\n' + drv.getId());
  assert.equal(n, 3);
  assert.equal(ctx.addDriveAttachments(docx), 0, '同じファイルは二重登録しない');
  const attachFolder = [...gas.folders.values()].find((f) => f.parent === folder.id && f.name === '添付資料');
  const memoDir = [...gas.folders.values()].find((f) => f.name === '2026-09');
  assert.ok(memoDir && gas.liveFiles(memoDir.id).some((f) => f.name === '面談メモ.txt'), 'フォルダー構造を保つ');
  assert.ok(gas.liveFiles(attachFolder.id).some((f) => f.name === '旧職務経歴書.pdf'));
  return { gas, ctx, cs, slides };
}
test('添付: アップロードとドライブ登録が「添付資料」シートに並ぶ', () => {
  const { cs } = candidateWithAttachments();
  const rows = cs.getSheetByName('添付資料').getDataRange().getValues().slice(1);
  assert.deepEqual(rows.map((r) => r[1]), ['旧職務経歴書.pdf', '面談メモ.txt', '履歴書_旧.docx', 'スキル.xlsx', 'ポートフォリオ']);
  assert.ok(rows.every((r) => r[0] === true));
  assert.deepEqual(rows.map((r) => r[2]), ['PDF', 'テキスト', 'Word', 'Excel', 'Googleスライド']);
});
test('取り込み: 資料を読み、AI の JSON で空欄を埋める（2 回目は表を重複させない）', () => {
  const { gas, ctx, cs } = candidateWithAttachments();
  gas.props.set('GEMINI_API_KEY', 'k');
  const reply = {
    '基本情報': { '氏名': '山田 花子', 'ふりがな': 'やまだ はなこ', '生年月日': '1995-04-01', 'メール': 'hanako@example.com', '存在しない項目': 'x' },
    '学歴': [{ '年': 2014, '月': 3, '学校名・学部・学科': 'サンプル高等学校', '区分': '卒業' }, { '年': 2018, '月': 3, '学校名・学部・学科': 'サンプル大学 経済学部', '区分': '卒業' }],
    '職歴': [{ '入社年': '2018', '入社月': '4', '退社年': '', '退社月': '', '会社名': '株式会社サンプル', '雇用形態': '正社員', '部門・職位': '営業部' }],
    'プロジェクト': [{ '会社名': '株式会社サンプル', 'プロジェクト名': '新規開拓', '支援内容（1行1項目）': ['テレアポ', '提案'], '成果・実績': '売上120%' }],
    '文章': { '職務要約': '要約です。売上120%。' },
    '推薦書': { '転職理由': '医療DXに広く関わりたい', '希望年収': '600万円' },
    '要確認': ['雇用形態の証跡', '2014年3月以前の学歴'],
  };
  let calls = 0;
  gas.setFetch((url, opt) => {
    if (url.includes('googleapis.com/drive/v3/files/')) {
      assert.equal(opt.headers.Authorization, 'Bearer oauth-token');
      return { code: 200, body: 'スライド本文: 実績紹介' };
    }
    calls++;
    assert.match(url, /models\/gemini-2\.5-flash:generateContent$/);
    const body = JSON.parse(opt.payload);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    const parts = body.contents[0].parts;
    const texts = parts.filter((p) => p.text).map((p) => p.text).join('\n');
    assert.ok(parts.some((p) => p.inline_data && p.inline_data.mime_type === 'application/pdf'), 'PDF は直接渡す');
    for (const t of ['希望年収600万円', '氏名 山田 花子', 'Python\t3年', 'スライド本文', '"学校名・学部・学科"']) assert.ok(texts.includes(t), t);
    return { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }) };
  });
  gas.uiQueue.alerts.push('YES');
  ctx.menuImport();
  assert.equal(calls, 1, gas.uiQueue.shown.join('\n'));
  const m = ctx.loadModel(cs);
  assert.equal(m.basic['ふりがな'], 'やまだ はなこ');
  assert.equal(m.education.length, 2);
  assert.equal(m.education[1].year, 2018);
  assert.equal(m.jobs[0].company, '株式会社サンプル');
  assert.deepEqual([...m.projects[0].tasks], ['テレアポ', '提案']);
  assert.equal(m.texts.summary, '要約です。売上120%。');
  assert.equal(m.suisen['希望年収'], '600万円');
  const imp = cs.getSheetByName('取り込み結果').getDataRange().getValues();
  assert.ok(imp.some((r) => r[0] === '要確認' && r[1] === '雇用形態の証跡'));
  // 変換用の一時ファイルはゴミ箱へ
  assert.ok(gas.converted.length >= 2);
  assert.ok([...gas.files.values()].filter((f) => /^_tmp_/.test(f.name)).every((f) => f.trashed));
  // 2 回目（空欄だけ）: 表は増えない
  gas.uiQueue.alerts.push('YES');
  ctx.menuImport();
  assert.equal(ctx.loadModel(cs).education.length, 2);
  assert.ok(cs.getSheetByName('取り込み結果').getDataRange().getValues().some((r) => r[0] === '反映しなかった'));
  // 置き換え: 表を読み取り結果で置き換える
  reply['学歴'] = [{ '年': 2018, '月': 3, '学校名・学部・学科': 'サンプル大学', '区分': '卒業' }];
  gas.uiQueue.alerts.push('NO');
  ctx.menuImport();
  assert.equal(ctx.loadModel(cs).education.length, 1);
});
test('取り込み: 資料が無い / AI が JSON を返さない → 何も書かない', () => {
  const { gas, ctx, cs } = candidateWithAttachments();
  gas.props.set('GEMINI_API_KEY', 'k');
  gas.setFetch((url) => (url.includes('/drive/v3/') ? { code: 200, body: 'x' } : { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'すみません' }] } }] }) }));
  gas.uiQueue.alerts.push('YES');
  ctx.menuImport();
  assert.ok(gas.uiQueue.shown.some((m) => m.startsWith('取り込みできませんでした')));
  assert.equal(cs.getSheetByName('学歴').getLastRow(), 1);
});

console.log('推薦書');
test('標準レイアウト: 宛先・概要表・推薦理由・経歴概要', () => {
  const { gas, ctx } = boot();
  gas.uiQueue.prompts.push('推薦');
  ctx.menuBuildSuisen();
  const f = outFolder(gas, '推薦');
  const doc = gas.liveFiles(f.id).find((x) => x.name === '田中 太郎様_推薦書');
  assert.ok(doc, gas.uiQueue.shown.join('\n'));
  const t = gas.docText(doc.id);
  for (const s of ['株式会社サンプルコンサルティング　御中', '人事部 採用ご担当者　様', '佐藤 花子', '推　薦　書', '「DXコンサルタント（医療・ヘルスケア領域）」に推薦', '田中 太郎（たなか たろう）', '株式会社サンプル薬局（調剤薬局／業務改善・DX推進担当）', '現在 462万円　／　希望 600万円', '■推薦理由', '1. 医療現場の業務を分解', '■経歴概要', '・2023年7月～現在　株式会社サンプル薬局', '■懸念点と見解', '敬具']) {
    assert.ok(t.includes(s), s);
  }
  assert.ok(!t.includes('面談メモ'));
});
test('推薦書の必須項目が空ならエラー確認を出し、「いいえ」で作らない', () => {
  const { gas, ctx } = boot();
  const { sheetId } = newCandidate(gas, ctx);
  gas.setActive(gas.globals.SpreadsheetApp.openById(sheetId));
  const n = gas.files.size;
  gas.uiQueue.alerts.push('NO');
  ctx.menuBuildSuisen();
  assert.equal(gas.files.size, n);
  const chk = gas.globals.SpreadsheetApp.openById(sheetId).getSheetByName('チェック結果').getDataRange().getValues();
  assert.ok(chk.some((r) => r[1] === '推薦書' && r[2] === '推薦文'));
});
test('3 点すべて生成 → 〇〇様フォルダーに 3 文書 + 3 PDF', () => {
  const { gas, ctx } = boot();
  gas.uiQueue.prompts.push('全部');
  ctx.menuBuildAll();
  const names = gas.liveFiles(outFolder(gas, '全部').id).map((f) => f.name).sort();
  assert.deepEqual(names, ['田中 太郎様_履歴書', '田中 太郎様_履歴書.pdf', '田中 太郎様_推薦書', '田中 太郎様_推薦書.pdf', '田中 太郎様_職務経歴書', '田中 太郎様_職務経歴書.pdf'].sort());
});
test('推薦書テンプレートに流し込み', () => {
  const { gas, ctx, ss } = boot();
  const tpl = gas.createDoc('会社推薦書', (b) => {
    b.appendParagraph('{{推薦先企業}} 御中　{{推薦日}}');
    b.appendTable([['候補者', '{{氏名}}（{{年齢}}歳）'], ['現職', '{{現職}}'], ['推薦理由', '{{推薦ポイント}}'], ['推薦文', '{{推薦文}}']]);
  });
  assert.equal(ctx.classifyTokens_(gas.docText(tpl)).missing.length, 0, '推薦書は生年月日・住所を要求しない');
  setSetting(ss, '推薦書テンプレート', tpl);
  gas.uiQueue.prompts.push('tpl推薦');
  ctx.menuBuildSuisen();
  const out = gas.liveFiles(outFolder(gas, 'tpl推薦').id).find((f) => f.mime.includes('document'));
  const t = gas.docText(out.id);
  assert.ok(!t.includes('{{'), t);
  for (const s of ['株式会社サンプルコンサルティング 御中', '田中 太郎（', '株式会社サンプル薬局（', '・医療現場の業務を分解', '仮説→実行→検証']) assert.ok(t.includes(s), s);
});
test('推薦書を AI で下書き → 提案 → 反映', () => {
  const { gas, ctx, ss } = boot();
  gas.props.set('GEMINI_API_KEY', 'k');
  gas.setFetch((url, opt) => {
    const prompt = JSON.parse(opt.payload).contents[0].parts[0].text;
    assert.ok(prompt.includes('DXコンサルタント') && prompt.includes('[推薦書!推薦文]'));
    return { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ review: 'r', proposals: [{ address: '推薦書!推薦文', proposed: 'AI 推薦文。待ち時間60%削減。', priority: '高' }] }) }] } }] }) };
  });
  ctx.menuSuisenDraft();
  const psh = ss.getSheetByName('AI提案');
  assert.equal(psh.getRange(4, 7).getValue(), '未反映');
  psh.getRange(4, 1).setValue(true);
  ctx.menuApplyProposals();
  assert.equal(ctx.loadModel(ss).suisen['推薦文'], 'AI 推薦文。待ち時間60%削減。');
});

console.log('会社規定様式（ラベル型の推薦書・会社枠型の職務経歴書）');
function labelStyleShokumu(gas) {
  return gas.createDoc('職務経歴書＿マスター', (b) => {
    ['職 務 経 歴 書', '20xx年xx月xx日現在', '氏名　○○ ○○', '', '■職務要約', '', '', '■職務経歴', ''].forEach((t) => b.appendParagraph(t));
    const t = b.appendTable([[''], ['事業内容：不明'], ['【担当業務】']]);
    const info = t.getRow(1).getCell(0);
    info.appendParagraph('資本金：不明　売上高：不明'); info.appendParagraph('従業員数：不明　上場：未上場');
    const duty = t.getRow(2).getCell(0);
    ['・', '', '【実績・取り組み】', '・', ''].forEach((x) => duty.appendParagraph(x));
    ['', '', '■資格', '', '■スキル・経験', '', '■自己PR', '', '　　以上'].forEach((x) => b.appendParagraph(x));
  });
}
function labelStyleSuisen(gas) {
  return gas.createDoc('推薦書マスター', (b) => {
    ['推薦書', '20xx年xx月xx日現在', '氏名　○○ ○○', '', '', '氏名：', '', '年齢：', '', '性別', '', '住まい：', '', '現年収：', '',
      '希望年収：', '', '退職理由：', '', '', '志望動機：', '', '', '推薦コメント：', '', '', '　　以上'].forEach((t) => b.appendParagraph(t));
  });
}
test('職務経歴書: 自動挿入 → 会社枠を会社数だけ複製、「不明」は空欄時の既定値として残る', () => {
  const { gas, ctx, ss } = boot();
  const tpl = labelStyleShokumu(gas);
  ctx.autoInsertTokensDoc_(tpl);
  const tk = gas.docText(tpl);
  for (const x of ['{{作成日}}現在', '氏名　{{氏名}}', '{{職務要約}}', '{{会社_見出し}}', '事業内容：{{会社_事業内容|不明}}', '資本金：{{会社_資本金|不明}}　売上高：{{会社_売上高|不明}}',
    '従業員数：{{会社_従業員数|不明}}　上場：{{会社_上場|未上場}}', '{{会社_担当業務}}', '{{会社_実績}}', '{{資格一覧}}', '{{スキル経験}}', '{{自己PR}}']) assert.ok(tk.includes(x), x + '\n' + tk);
  assert.ok(!tk.includes('{{職務経歴詳細}}'), '会社枠があるので「■職務経歴」見出しには入れない');
  assert.equal(ctx.classifyTokens_(tk).missing.length, 0, JSON.stringify(ctx.classifyTokens_(tk)));
  const jobs = ss.getSheetByName('職歴');
  jobs.getRange(3, 11).setValue('');
  setSetting(ss, '職務経歴書テンプレート', tpl);
  gas.uiQueue.prompts.push('label');
  ctx.menuBuildShokumu();
  const out = gas.liveFiles(outFolder(gas, 'label').id).find((f) => f.mime.includes('document'));
  assert.ok(out, gas.uiQueue.shown.join('\n'));
  const t = gas.docText(out.id);
  assert.ok(!t.includes('{{'), t);
  const tables = gas.docBody(out.id).getTables();
  assert.equal(tables.length, 2, '2 社分');
  assert.ok(tables[0].getText().startsWith('2023年7月～現在　株式会社サンプル薬局（正社員）'), tables[0].getText());
  assert.ok(tables[0].getText().includes('売上高：不明'), '空なら既定値「不明」\n' + tables[0].getText());
  assert.ok(tables[0].getText().includes('上場：未上場'));
  assert.ok(tables[0].getText().includes('所属：調剤薬局／業務改善・DX推進担当'));
  assert.ok(tables[0].getText().includes('◆社内AI推進・業務改善プロジェクト（2025年9月～現在）'));
  assert.ok(tables[0].getText().includes('・【社内AI推進・業務改善プロジェクト】調剤待ち時間 平均20分→8分（60%削減）'));
  assert.ok(tables[1].getText().includes('事業内容：ドラッグストアチェーン経営、調剤薬局経営'));
  assert.ok(tables[1].getText().includes('上場：東証プライム市場'));
  for (const x of ['年9月', '氏名　田中 太郎', '・普通自動車第一種運転免許（2016年10月）', '【課題解決力】', '＜ツール・技術＞', '現場の業務構造を可視化', '以上']) assert.ok(t.includes(x), x + '\n' + t);
  const shikaku = t.slice(t.indexOf('■資格'), t.indexOf('■スキル・経験'));
  assert.ok(!shikaku.includes('Google Workspace'), 'ツール類は資格ではなくスキル・経験へ');
});
test('推薦書: 「氏名：」などのラベルの右に値、文章は次の行に', () => {
  const { gas, ctx, ss } = boot();
  const tpl = labelStyleSuisen(gas);
  ctx.autoInsertTokensDoc_(tpl);
  const tk = gas.docText(tpl);
  for (const x of ['氏名：{{氏名}}', '年齢：{{年齢}}歳', '性別：{{性別}}', '住まい：{{住まい}}', '現年収：{{現在年収}}', '希望年収：{{希望年収}}', '退職理由：\n{{転職理由}}', '志望動機：\n{{志望動機}}', '推薦コメント：\n{{推薦コメント}}']) {
    assert.ok(tk.includes(x), x + '\n' + tk);
  }
  setSetting(ss, '推薦書テンプレート', tpl);
  gas.uiQueue.prompts.push('label推薦');
  ctx.menuBuildSuisen();
  const out = gas.liveFiles(outFolder(gas, 'label推薦').id).find((f) => f.mime.includes('document'));
  assert.ok(out, gas.uiQueue.shown.join('\n'));
  const t = gas.docText(out.id);
  assert.ok(!t.includes('{{'), t);
  for (const x of ['氏名：田中 太郎', /年齢：\d+歳/, '性別：男', '住まい：東京都千代田区', '現年収：462万円', '希望年収：600万円（最低 550万円）', '退職理由：\n一店舗・一法人の改善', '志望動機：\n医療現場で業務改善', '推薦コメント：\n・医療現場の業務を分解', '田中様は、調剤薬局の薬剤師として']) {
    if (x instanceof RegExp) assert.match(t, x); else assert.ok(t.includes(x), x + '\n' + t);
  }
  assert.ok(!t.includes('サンプルマンション'), '住まいに番地・建物名を出さない');
});

console.log('テンプレート台帳（スプレッドシートの各シート）');
function templateBook(gas) {
  const book = gas.createSpreadsheet('職務経歴書テンプレート集', ['ITエンジニア用_職務経歴書', 'コンサル用_職務経歴書', '推薦書_簡易']);
  for (const name of ['ITエンジニア用_職務経歴書', 'コンサル用_職務経歴書']) {
    book.getSheetByName(name).getRange(1, 1, 8, 2).setValues([
      [name, ''], ['氏名', '{{氏名}}'], ['', ''],
      ['{{会社_見出し}}', ''], ['事業内容：{{会社_事業内容|不明}}', '上場：{{会社_上場|未上場}}'], ['{{会社_担当業務}}', ''],
      ['■自己PR', ''], ['{{自己PR}}', ''],
    ]);
  }
  book.getSheetByName('推薦書_簡易').getRange(1, 1, 2, 2).setValues([['氏名', '{{氏名}}'], ['推薦', '{{推薦コメント}}']]);
  return book.getId();
}
test('登録: 各シートを 1 件ずつ、種別をシート名から推定', () => {
  const { gas, ctx, ss } = boot();
  const book = templateBook(gas);
  assert.equal(ctx.registerTemplates_(ss, 'https://docs.google.com/spreadsheets/d/' + book + '/edit'), 3);
  assert.equal(ctx.registerTemplates_(ss, book), 0, '二重登録しない');
  const rows = ss.getSheetByName('テンプレート').getDataRange().getValues().slice(1);
  assert.deepEqual(rows.map((r) => r[0] + '|' + r[3]), ['職務経歴書|ITエンジニア用_職務経歴書', '職務経歴書|コンサル用_職務経歴書', '推薦書|推薦書_簡易']);
});
test('生成時に番号で選ぶ: 選んだシートだけ残し、会社枠の行を会社数だけ複製。次回は前回の選択が既定', () => {
  const { gas, ctx, ss } = boot();
  ctx.registerTemplates_(ss, templateBook(gas));
  gas.uiQueue.prompts.push('2', '台帳');
  ctx.menuBuildShokumu();
  assert.ok(gas.uiQueue.shown.includes('PROMPT 職務経歴書のテンプレート'), gas.uiQueue.shown.join('\n'));
  const out = gas.liveFiles(outFolder(gas, '台帳').id).find((f) => f.mime.includes('spreadsheet'));
  assert.ok(out, gas.uiQueue.shown.join('\n'));
  assert.deepEqual(gas.files.get(out.id).ss.sheets.map((x) => x.name), ['コンサル用_職務経歴書']);
  const g = gas.sheetGrid(out.id, 'コンサル用_職務経歴書');
  assert.equal(g[1][1], '田中 太郎');
  assert.ok(g[3][0].startsWith('2023年7月～現在　株式会社サンプル薬局'), JSON.stringify(g));
  assert.equal(g[4][1], '上場：未上場');
  assert.ok(g[6][0].startsWith('2023年4月～2023年6月　株式会社サンプルドラッグ'), JSON.stringify(g));
  assert.equal(g[7][1], '上場：東証プライム市場');
  assert.equal(g[9][0], '■自己PR', '下の内容は押し下げられる');
  assert.ok(!JSON.stringify(g).includes('{{'));
  gas.uiQueue.prompts.push('', '台帳2');
  ctx.menuBuildShokumu();
  const out2 = gas.liveFiles(outFolder(gas, '台帳2').id).find((f) => f.mime.includes('spreadsheet'));
  assert.deepEqual(gas.files.get(out2.id).ss.sheets.map((x) => x.name), ['コンサル用_職務経歴書']);
  gas.uiQueue.prompts.push('0', '台帳3');
  ctx.menuBuildShokumu();
  assert.ok(gas.liveFiles(outFolder(gas, '台帳3').id).some((f) => f.mime.includes('document')));
  gas.uiQueue.shown.length = 0;
  gas.uiQueue.prompts.push('台帳4');
  ctx.menuBuildSuisen();
  assert.ok(!gas.uiQueue.shown.includes('PROMPT 推薦書のテンプレート'));
  const s4 = gas.liveFiles(outFolder(gas, '台帳4').id).find((f) => f.mime.includes('spreadsheet'));
  assert.ok(s4, gas.uiQueue.shown.join('\n'));
  assert.ok(gas.sheetGrid(s4.id, '推薦書_簡易')[1][1].startsWith('・医療現場の業務を分解'));
});
test('範囲外の番号・キャンセルでは何も作らない', () => {
  const { gas, ctx, ss } = boot();
  ctx.registerTemplates_(ss, templateBook(gas));
  const n = gas.files.size;
  gas.uiQueue.prompts.push('9');
  ctx.menuBuildShokumu();
  gas.uiQueue.prompts.push(null);
  ctx.menuBuildShokumu();
  assert.equal(gas.files.size, n);
  assert.ok(gas.uiQueue.shown.some((m) => m.includes('番号が範囲外')));
});

console.log(`\n${passed} e2e tests passed`);
