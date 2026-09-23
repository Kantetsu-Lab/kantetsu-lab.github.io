/**
 * メニューとエントリポイント。ここから各モジュールを呼ぶ。
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(KL.MENU_TITLE)
    .addItem('① 初期セットアップ（シート作成・サンプル投入）', 'menuSetupWithSample')
    .addItem('　 初期セットアップ（サンプルなし）', 'menuSetupEmpty')
    .addSeparator()
    .addItem('② 入力チェック', 'menuCheck')
    .addSeparator()
    .addItem('③ 履歴書を生成', 'menuBuildRirekisho')
    .addItem('③ 職務経歴書を生成', 'menuBuildShokumu')
    .addItem('③ 両方を生成', 'menuBuildBoth')
    .addSeparator()
    .addSubMenu(ui.createMenu('④ AI 分析（Gemini / Claude）')
      .addItem('分析して提案を作る', 'menuAiAnalyze')
      .addItem('チェックした提案を反映', 'menuApplyProposals')
      .addItem('添削プロンプトだけ作る（Gemini に貼る）', 'menuAiPrompt')
      .addItem('APIキーを設定', 'menuSetApiKey'))
    .addSubMenu(ui.createMenu('⑤ 会社規定の用紙（テンプレート）')
      .addItem('テンプレートを診断', 'menuDiagnoseTemplate')
      .addItem('用紙にトークンを自動挿入（コピーを作成）', 'menuAutoInsertTokens')
      .addItem('トークン一覧を表示', 'menuTokenList'))
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
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  if (!guardErrors_(ss, model)) return;
  try {
    var folder = chooseOutputFolder_(ss, model.settings, ui);
    if (!folder) return;
    var msg = ['保存先: ' + folder.getName() + '\n' + folder.getUrl()];
    if (doRireki) {
      var r = buildRirekishoDoc_(model, ss, folder);
      msg.push('履歴書:\n' + r.docUrl + (r.pdfUrl ? '\nPDF: ' + r.pdfUrl : ''));
    }
    if (doShokumu) {
      var s = buildShokumuDoc_(model, ss, folder);
      msg.push('職務経歴書:\n' + s.docUrl + (s.pdfUrl ? '\nPDF: ' + s.pdfUrl : ''));
    }
    ui.alert('生成完了', msg.join('\n\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('生成できませんでした', String(e.message || e), ui.ButtonSet.OK);
  }
}

// ---------------- AI

function menuAiPrompt() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var sh = writeAiSheet_(ss, buildReviewPrompt_(model), '');
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('プロンプトを作成しました',
    '「AI添削」シートの A2 セルをコピーして、Gemini（Workspace）や Claude に貼り付けてください。\n' +
    '社内ルール（西暦統一・雇用形態・空白期間・一貫性・再現性）を含んだ添削指示になっています。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiAnalyze() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var prompt = buildAnalysisPrompt_(model);
  try {
    var raw = callAi_(prompt, model.settings, KL.AI_SYSTEM);
    var parsed = parseAnalysis_(raw);
    var sh = writeProposalSheet_(ss, parsed.review, parsed.proposals);
    writeAiSheet_(ss, buildReviewPrompt_(model), raw);
    ss.setActiveSheet(sh);
    ui.alert('AI 分析 完了',
      '「AI提案」シートに総評と ' + parsed.proposals.length + ' 件の修正提案を書き出しました。\n' +
      '内容を確認し、採用する行の「反映」にチェックを付けて「チェックした提案を反映」を実行してください。\n' +
      '※ 事実（社名・年月・数値）は必ず自分で確認してください。',
      ui.ButtonSet.OK);
  } catch (e) {
    writeAiSheet_(ss, buildReviewPrompt_(model), '');
    ui.alert('AI 分析 失敗', String(e.message || e) + '\n\n外部 API が使えない環境では「添削プロンプトだけ作る」を使い、Gemini に貼り付けてください。', ui.ButtonSet.OK);
  }
}

function menuApplyProposals() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var n = applyProposals_(ss);
  SpreadsheetApp.getUi().alert('反映完了', n + ' 件をシートに反映しました。「② 入力チェック」→「③ 生成」で確認してください。', SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuSetApiKey() {
  var ui = SpreadsheetApp.getUi();
  var which = ui.alert('APIキーを設定', 'Gemini のキーを設定しますか？\n（「いいえ」で Claude のキー）', ui.ButtonSet.YES_NO_CANCEL);
  if (which === ui.Button.CANCEL || which === ui.Button.CLOSE) return;
  var provider = which === ui.Button.YES ? 'gemini' : 'claude';
  var propName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
  var res = ui.prompt((provider === 'gemini' ? 'Gemini' : 'Claude') + ' APIキー',
    (provider === 'gemini' ? 'Google AI Studio で発行したキー' : 'sk-ant- で始まるキー') +
    'を貼り付けてください（このアカウントのユーザープロパティに保存され、共有者には見えません）。\n空欄で OK を押すと削除します。',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = nz_(res.getResponseText());
  var props = PropertiesService.getUserProperties();
  if (key) { props.setProperty(propName, key); ui.alert('保存しました。「設定」シートの AIプロバイダ を ' + provider + ' にしてください。'); }
  else { props.deleteProperty(propName); ui.alert('削除しました。'); }
}

// ---------------- テンプレート

function askTemplateSpec_(ui, settings) {
  var res = ui.prompt('テンプレート',
    '用紙（Google ドキュメント / スプレッドシート）の URL か ID を入力してください。\n' +
    '空欄 → 「設定」シートの 履歴書テンプレート を使用',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return '';
  return nz_(res.getResponseText()) || nz_(settings['履歴書テンプレート']) || nz_(settings['職務経歴書テンプレート']);
}

function menuDiagnoseTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var spec = askTemplateSpec_(ui, model.settings);
  if (!spec) return;
  try {
    var tpl = resolveTemplateFile_(spec);
    var r = classifyTokens_(templateText_(tpl));
    ui.alert('テンプレート診断: ' + tpl.name,
      '認識したトークン (' + r.known.length + '): ' + (r.known.join(', ') || 'なし') + '\n\n' +
      '不明なトークン (' + r.unknown.length + '): ' + (r.unknown.join(', ') || 'なし') + '\n\n' +
      (r.missing.length ? '不足している主要トークン: ' + r.missing.join(', ') + '\n\nトークンが無い用紙なら「用紙にトークンを自動挿入」を試してください。' : '主要トークンは揃っています。「設定」シートにこの用紙の ID を入れて生成してください。'),
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('診断できません', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuAutoInsertTokens() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var spec = askTemplateSpec_(ui, model.settings);
  if (!spec) return;
  try {
    var tpl = resolveTemplateFile_(spec);
    var folder = chooseOutputFolder_(ss, model.settings, null);
    var out = copyTemplateAsGoogle_(tpl, tpl.name.replace(/\.(docx?|xlsx?)$/i, '') + '_トークン入り', folder);
    var n = out.kind === 'doc' ? autoInsertTokensDoc_(out.id) : autoInsertTokensSheet_(out.id);
    var r = classifyTokens_(templateText_({ id: out.id, mime: out.kind === 'doc' ? MIME_.GDOC : MIME_.GSHEET }));
    ui.alert('トークンを挿入しました（' + n + ' 箇所）',
      'コピーを作成しました:\n' + out.url + '\n\n' +
      '開いて、{{...}} の位置が正しいか確認・修正してください（ラベルの右隣／次の行に入れています）。\n' +
      (r.missing.length ? '自動で入れられなかった主要トークン: ' + r.missing.join(', ') + '\n手で追記してください。\n\n' : '') +
      '確認できたら「設定」シートの 履歴書テンプレート／職務経歴書テンプレート にこの URL を入れてください。',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('自動挿入できません', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuTokenList() {
  var L = ['用紙に書くトークン（{{ }} 付き）', ''];
  L.push('【単一値】');
  KL.TOKENS_SINGLE.forEach(function (t) { L.push('{{' + t[0] + '}}' + (t[1] ? '　' + t[1] : '')); });
  L.push('');
  L.push('【行リスト】表の 1 行（スプレッドシートは開始セル）に置くと行数分展開');
  Object.keys(KL.TOKENS_LIST).forEach(function (n) {
    L.push(KL.TOKENS_LIST[n].cols.map(function (c) { return '{{' + n + '_' + c + '}}'; }).join(' ') + '　' + KL.TOKENS_LIST[n].note);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('トークン一覧') || ss.insertSheet('トークン一覧');
  sh.clear();
  sh.getRange(1, 1, L.length, 1).setValues(L.map(function (x) { return [x]; }));
  sh.setColumnWidth(1, 700);
  ss.setActiveSheet(sh);
}

function menuHelp() {
  SpreadsheetApp.getUi().alert('使い方 (v' + KL.VERSION + ')',
    '【流れ】\n' +
    '① 初期セットアップ → ② 各シートに入力 → ② 入力チェック → ③ 生成 → ④ AI 分析で提案を反映 → 再生成\n\n' +
    '【シート】\n' +
    '基本情報: 履歴書の氏名・住所など\n' +
    '学歴 / 職歴: 両方の書類に使う。年は西暦4桁\n' +
    'プロジェクト: 職務経歴書の詳細。会社名は職歴と完全一致\n' +
    '経験・能力: 本文を書くか、5要素（ミッション→目標数字→課題→工夫点→結果）を埋める\n' +
    '免許・資格 / 実績 / 文章（職務要約・自己PR）\n' +
    '設定: 保存先・ファイル名パターン・テンプレート・PDF・AI\n\n' +
    '【出力】\n' +
    '生成時に保存先フォルダを聞きます（設定に書けば省略）。ファイル名は「氏名様_履歴書」形式。\n' +
    '会社規定の用紙がある場合は ⑤ でトークンを入れた用紙を作り、設定にその URL を入れると、その用紙に流し込みます。\n\n' +
    '【注意】\n' +
    'このスプレッドシートには個人情報が入ります。共有設定に注意し、GitHub 等に実データを置かないでください。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
