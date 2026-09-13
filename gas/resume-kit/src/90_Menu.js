/**
 * メニューとエントリポイント。ここから各モジュールを呼ぶ。
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu(KL.MENU_TITLE)
    .addItem('① 初期セットアップ（シート作成・サンプル投入）', 'menuSetupWithSample')
    .addItem('　 初期セットアップ（サンプルなし）', 'menuSetupEmpty')
    .addSeparator()
    .addItem('② 入力チェック', 'menuCheck')
    .addSeparator()
    .addItem('③ 履歴書を生成', 'menuBuildRirekisho')
    .addItem('③ 職務経歴書を生成', 'menuBuildShokumu')
    .addItem('③ 両方を生成', 'menuBuildBoth')
    .addSeparator()
    .addItem('④ AI添削プロンプトを作成（Gemini 等に貼る）', 'menuAiPrompt')
    .addItem('④ AI添削を実行（Claude API）', 'menuAiReview')
    .addItem('　 Claude APIキーを設定', 'menuSetApiKey')
    .addSeparator()
    .addItem('使い方', 'menuHelp')
    .addToUi();
}

function menuSetupWithSample() { setupAndNotify_(true); }
function menuSetupEmpty() { setupAndNotify_(false); }

function setupAndNotify_(withSample) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets_(ss, withSample);
  SpreadsheetApp.getUi().alert('セットアップ完了',
    'シートを作成しました。\n\n' +
    '1. 「基本情報」「学歴」「職歴」…を上から順に入力\n' +
    '2. 「② 入力チェック」でエラーを潰す\n' +
    '3. 「③ 両方を生成」で Google ドキュメント／PDF を出力\n\n' +
    (withSample ? '※ サンプルは架空の人物です。自分のデータに書き換えてください。' : ''),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var results = runChecks(model);
  writeCheckSheet_(ss, results);
  var c = summarizeChecks_(results);
  SpreadsheetApp.getUi().alert('入力チェック結果',
    'エラー: ' + c.ERROR + ' 件\n注意: ' + c.WARN + ' 件\n参考: ' + c.INFO + ' 件\n\n' +
    (c.ERROR ? 'エラーがあると生成結果に空欄や不整合が出ます。「チェック結果」シートを確認してください。' : 'エラーはありません。生成に進めます。'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function writeCheckSheet_(ss, results) {
  var sh = ss.getSheetByName(KL.SHEET.CHECK) || ss.insertSheet(KL.SHEET.CHECK);
  sh.clear();
  var rows = [['レベル', 'シート', '対象', '内容']];
  var order = { ERROR: 0, WARN: 1, INFO: 2 };
  results.slice().sort(function (a, b) { return order[a.level] - order[b.level]; })
    .forEach(function (r) { rows.push([r.level, r.where, r.item, r.message]); });
  if (rows.length === 1) rows.push(['OK', '-', '-', '指摘事項はありません。']);
  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e8eaed');
  for (var i = 1; i < rows.length; i++) {
    var color = rows[i][0] === 'ERROR' ? '#fce8e6' : rows[i][0] === 'WARN' ? '#fff4e5' : '#ffffff';
    sh.getRange(i + 1, 1, 1, 4).setBackground(color);
  }
  sh.setColumnWidth(1, 70).setColumnWidth(2, 110).setColumnWidth(3, 200).setColumnWidth(4, 600);
  sh.getRange(1, 4, rows.length, 1).setWrap(true);
  sh.setFrozenRows(1);
  ss.setActiveSheet(sh);
}

function guardErrors_(ss, model) {
  var results = runChecks(model);
  var c = summarizeChecks_(results);
  if (c.ERROR > 0) {
    writeCheckSheet_(ss, results);
    var ui = SpreadsheetApp.getUi();
    var ans = ui.alert('エラーがあります',
      'エラー ' + c.ERROR + ' 件。「チェック結果」シートを確認してください。\nこのまま生成しますか？（空欄や不整合のまま出力されます）',
      ui.ButtonSet.YES_NO);
    return ans === ui.Button.YES;
  }
  return true;
}

function menuBuildRirekisho() { buildAndNotify_(true, false); }
function menuBuildShokumu() { buildAndNotify_(false, true); }
function menuBuildBoth() { buildAndNotify_(true, true); }

function buildAndNotify_(doRireki, doShokumu) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  if (!guardErrors_(ss, model)) return;
  var msg = [];
  if (doRireki) {
    var r = buildRirekishoDoc_(model, ss);
    msg.push('履歴書:\n' + r.docUrl + (r.pdfUrl ? '\nPDF: ' + r.pdfUrl : ''));
  }
  if (doShokumu) {
    var s = buildShokumuDoc_(model, ss);
    msg.push('職務経歴書:\n' + s.docUrl + (s.pdfUrl ? '\nPDF: ' + s.pdfUrl : ''));
  }
  var folder = getOutputFolder_(ss, model.settings);
  msg.push('出力先フォルダ:\n' + folder.getUrl());
  SpreadsheetApp.getUi().alert('生成完了', msg.join('\n\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiPrompt() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var prompt = buildReviewPrompt_(model);
  var sh = writeAiSheet_(ss, prompt, '');
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('プロンプトを作成しました',
    '「AI添削」シートの A2 セルをコピーして、Gemini（Workspace）や Claude に貼り付けてください。\n' +
    '社内ルール（西暦統一・雇用形態・空白期間・一貫性・再現性）を含んだ添削指示になっています。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiReview() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var prompt = buildReviewPrompt_(model);
  var ui = SpreadsheetApp.getUi();
  try {
    var result = callClaudeReview_(prompt, model.settings);
    var sh = writeAiSheet_(ss, prompt, result);
    ss.setActiveSheet(sh);
    ui.alert('AI添削 完了', '「AI添削」シートの B2 セルに結果を書き出しました。', ui.ButtonSet.OK);
  } catch (e) {
    writeAiSheet_(ss, prompt, '');
    ui.alert('AI添削 失敗', String(e.message || e) + '\n\n外部APIが使えない環境では「AI添削プロンプトを作成」を使い、Gemini に貼り付けてください。', ui.ButtonSet.OK);
  }
}

function menuSetApiKey() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Claude APIキーを設定',
    'sk-ant- で始まるキーを貼り付けてください（このアカウントのユーザープロパティに保存され、他の共有者には見えません）。\n空欄で OK を押すと削除します。',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = nz_(res.getResponseText());
  var props = PropertiesService.getUserProperties();
  if (key) { props.setProperty('ANTHROPIC_API_KEY', key); ui.alert('保存しました。'); }
  else { props.deleteProperty('ANTHROPIC_API_KEY'); ui.alert('削除しました。'); }
}

function menuHelp() {
  SpreadsheetApp.getUi().alert('使い方 (v' + KL.VERSION + ')',
    '【流れ】\n' +
    '① 初期セットアップ → ② 各シートに入力 → ② 入力チェック → ③ 生成 → ④ AI添削 → 直して再生成\n\n' +
    '【シート】\n' +
    '基本情報: 履歴書の氏名・住所など\n' +
    '学歴 / 職歴: 履歴書と職務経歴書の両方に使う。年は西暦4桁\n' +
    'プロジェクト: 職務経歴書の詳細。会社名は職歴と完全一致\n' +
    '経験・能力: 本文を書くか、5要素（ミッション→目標数字→課題→工夫点→結果）を埋める\n' +
    '免許・資格: 「履歴書に載せる」に ○ で履歴書にも出す\n' +
    '文章: 職務要約・自己PR\n' +
    '設定: 出力先・フォント・PDF・AIモデル\n\n' +
    '【出力】\n' +
    'Google ドキュメント（編集可）と PDF を出力フォルダに保存します。写真は「写真ファイルID」を入れると自動挿入、無ければ枠のみ。\n\n' +
    '【注意】\n' +
    'このスプレッドシートには個人情報が入ります。共有設定に注意し、GitHub 等に実データを置かないでください。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
