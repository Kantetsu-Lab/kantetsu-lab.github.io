/**
 * メニューとエントリポイント。ここから各モジュールを呼ぶ。
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(KL.MENU_TITLE)
    .addItem('⓪ 新規候補者を作成（〇〇様フォルダー＋入力シート）', 'menuNewCandidate')
    .addSeparator()
    .addItem('① 初期セットアップ（シート作成・サンプル投入）', 'menuSetupWithSample')
    .addItem('　 初期セットアップ（サンプルなし）', 'menuSetupEmpty')
    .addSeparator()
    .addItem('② 添付資料を追加（PC / ドライブ）', 'menuAttach')
    .addItem('② 添付資料から入力シートを作成（AI）', 'menuImport')
    .addItem('② 入力チェック', 'menuCheck')
    .addSeparator()
    .addItem('③ 履歴書を生成', 'menuBuildRirekisho')
    .addItem('③ 職務経歴書を生成', 'menuBuildShokumu')
    .addItem('③ 推薦書を生成', 'menuBuildSuisen')
    .addItem('③ 3 点すべて生成', 'menuBuildAll')
    .addSeparator()
    .addSubMenu(ui.createMenu('④ AI 分析（Gemini / Claude）')
      .addItem('分析して提案を作る', 'menuAiAnalyze')
      .addItem('推薦書を AI で下書き', 'menuSuisenDraft')
      .addItem('チェックした提案を反映', 'menuApplyProposals')
      .addItem('添削プロンプトだけ作る（Gemini に貼る）', 'menuAiPrompt')
      .addItem('APIキーを設定', 'menuSetApiKey'))
    .addSubMenu(ui.createMenu('⑤ 会社規定の用紙（テンプレート）')
      .addItem('テンプレートを登録（スプレッドシートは各シート）', 'menuRegisterTemplates')
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

function guardErrors_(ss, model, kinds) {
  var results = runChecks(model);
  if (kinds && kinds.indexOf('推薦書') >= 0) results = results.concat(runSuisenChecks_(model));
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

function menuBuildRirekisho() { buildAndNotify_(['履歴書']); }
function menuBuildShokumu() { buildAndNotify_(['職務経歴書']); }
function menuBuildBoth() { buildAndNotify_(['履歴書', '職務経歴書']); }
function menuBuildSuisen() { buildAndNotify_(['推薦書']); }
function menuBuildAll() { buildAndNotify_(['履歴書', '職務経歴書', '推薦書']); }

function buildAndNotify_(kinds) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  if (!guardErrors_(ss, model, kinds)) return;
  var builders = { '履歴書': buildRirekishoDoc_, '職務経歴書': buildShokumuDoc_, '推薦書': buildSuisenDoc_ };
  try {
    // 台帳にテンプレートが複数あれば、先に選んでもらう（保存先を作る前に）
    var chosen = {};
    kinds.forEach(function (k) { chosen[k] = chooseTemplate_(ss, k, ui); });
    var folder = chooseOutputFolder_(ss, model.settings, ui, nz_(model.basic['氏名']));
    if (!folder) return;
    var msg = ['保存先: ' + folder.getName() + '\n' + folder.getUrl()];
    kinds.forEach(function (k) {
      var r = builders[k](model, ss, folder, chosen[k]);
      msg.push(k + ':\n' + r.docUrl + (r.pdfUrl ? '\nPDF: ' + r.pdfUrl : ''));
    });
    ui.alert('生成完了', msg.join('\n\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('生成できませんでした', String(e.message || e), ui.ButtonSet.OK);
  }
}

// ---------------- 新規作成・添付・取り込み

function menuNewCandidate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var nameRes = ui.prompt('新規候補者を作成', '候補者の氏名を入力してください（例: 山田 花子）。', ui.ButtonSet.OK_CANCEL);
  if (nameRes.getSelectedButton() !== ui.Button.OK) return;
  var name = nz_(nameRes.getResponseText());
  if (!name) { ui.alert('氏名が空です。'); return; }
  try {
    var settings = loadModel(ss).settings;
    // 「〇〇様」フォルダーを作る場所。候補者シートの保存先（〇〇様フォルダー自体）は親として使わない
    var parent = chooseParentFolder_(ss, withoutCandidateFolder_(settings), ui, { alwaysAsk: true, title: '「' + candidateFolderName_(settings, name) + '」フォルダーを作る場所', lead: 'この中に「' + candidateFolderName_(settings, name) + '」フォルダーを作ります。' });
    if (!parent) return;
    var r = createCandidate_(ss, name, parent);
    ui.alert(r.reused ? '既にあります' : '作成しました',
      '「' + r.folder.getName() + '」フォルダー:\n' + r.folder.getUrl() + '\n\n' +
      '入力シート:\n' + r.ssUrl + '\n\n' +
      '入力シートを開き、「② 添付資料を追加」→「② 添付資料から入力シートを作成（AI）」→「③ 3 点すべて生成」の順に進めてください。\n' +
      '（複製したシートではスクリプトの承認をもう一度求められます）',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('作成できませんでした', String(e.message || e), ui.ButtonSet.OK);
  }
}

/** 出力フォルダが「〇〇様」フォルダー（候補者用シート）なら、その親を既定にする */
function withoutCandidateFolder_(settings) {
  var copy = {};
  Object.keys(settings).forEach(function (k) { copy[k] = settings[k]; });
  var f = resolveFolder_(settings['出力フォルダ']);
  if (f && /様$/.test(f.getName())) {
    var ps = f.getParents();
    copy['出力フォルダ'] = ps.hasNext() ? ps.next().getId() : '';
  }
  return copy;
}

function menuAttach() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  try {
    var folder = ensureAttachFolder_(ss, loadModel(ss), ui);
    if (!folder) return;
    attachSheet_(ss);
    var html = HtmlService.createHtmlOutput(attachDialogHtml_(folder.getName())).setWidth(560).setHeight(600);
    ui.showModalDialog(html, '添付資料を追加');
  } catch (e) {
    ui.alert('添付できません', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuImport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  if (checkedAttachments_(ss).length === 0) {
    ui.alert('取り込む資料がありません', '「② 添付資料を追加」で資料を登録し、「添付資料」シートの「取り込む」にチェックを付けてください。', ui.ButtonSet.OK);
    return;
  }
  var ans = ui.alert('取り込み方法',
    'はい → 空欄だけ埋める（入力済みの値・行は変えない。推奨）\nいいえ → 読み取った内容で置き換える',
    ui.ButtonSet.YES_NO_CANCEL);
  if (ans !== ui.Button.YES && ans !== ui.Button.NO) return;
  var mode = ans === ui.Button.YES ? 'fill' : 'overwrite';
  try {
    var col = collectAttachmentParts_(ss, model.settings);
    if (col.parts.length === 0) throw new Error('読み取れた資料がありません。' + col.errors.join(' / '));
    var parts = [{ text: buildImportPrompt_(model) }].concat(col.parts);
    var raw = callAiParts_(parts, model.settings, KL.AI_SYSTEM, { json: true, geminiModelKey: 'Gemini抽出モデル', maxTokens: 16000, effort: 'low' });
    var data = parseJsonObject_(raw);
    if (!data) throw new Error('AI の返答を読み取れませんでした。もう一度実行するか、資料を減らしてください。');
    var res = applyImport_(ss, data, mode);
    var sh = writeImportSheet_(ss, col.sources, col.errors, data, res);
    ss.setActiveSheet(sh);
    var checks = summarizeChecks_(runChecks(loadModel(ss)));
    ui.alert('取り込み完了',
      col.sources.length + ' 件の資料から読み取りました。\n' +
      Object.keys(res.rows).map(function (k) { return k + ': ' + res.rows[k] + ' 行'; }).join('\n') +
      (res.skipped.length ? '\n変更しなかったシート: ' + res.skipped.join('、') : '') + '\n\n' +
      '要確認: ' + (Array.isArray(data['要確認']) ? data['要確認'].length : 0) + ' 件（「取り込み結果」シート）\n' +
      '入力チェック: エラー ' + checks.ERROR + ' / 注意 ' + checks.WARN + '\n\n' +
      'AI の読み取りには誤りがあり得ます。特に年月・雇用形態・数値は原本と照合してください。',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('取り込みできませんでした', String(e.message || e), ui.ButtonSet.OK);
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

function menuSuisenDraft() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  try {
    var raw = callAi_(buildSuisenDraftPrompt_(model), model.settings, KL.AI_SYSTEM);
    var parsed = parseAnalysis_(raw);
    var sh = writeProposalSheet_(ss, parsed.review, parsed.proposals);
    ss.setActiveSheet(sh);
    ui.alert('推薦書の下書き 完了',
      '「AI提案」シートに ' + parsed.proposals.length + ' 件の下書きを書き出しました。\n採用する行にチェックを付けて「チェックした提案を反映」を実行してください。',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('下書きできませんでした', String(e.message || e), ui.ButtonSet.OK);
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

function menuRegisterTemplates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('テンプレートを登録',
    '用紙の URL か ID を入力してください。\n' +
    'スプレッドシートの場合は、シート（タブ）ごとに 1 件ずつ登録します。\n' +
    '種別（履歴書 / 職務経歴書 / 推薦書）はシート名・ファイル名から推定します。違っていたら「テンプレート」シートで直してください。',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK || !nz_(res.getResponseText())) return;
  try {
    var n = registerTemplates_(ss, res.getResponseText(), '職務経歴書');
    ss.setActiveSheet(templateSheet_(ss));
    ui.alert('登録しました', n + ' 件を「テンプレート」シートに追加しました。\n同じ種別が 2 件以上あると、生成時に番号で選べます（○ を付けたものが既定）。', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('登録できません', String(e.message || e), ui.ButtonSet.OK);
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
  L.push('');
  L.push('【会社枠】職務経歴の枠（ドキュメントは表、スプレッドシートは行のまとまり）に置くと、会社の数だけ複製');
  KL.TOKENS_COMPANY.forEach(function (t) { L.push('{{' + t[0] + '}}' + (t[1] ? '　' + t[1] : '')); });
  L.push('');
  L.push('【既定値】{{名前|既定値}} と書くと値が空のとき既定値を出す（例: {{会社_上場|未上場}}）');
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
    '⓪ 新規候補者を作成（〇〇様フォルダー＋入力シート）→ 作られた入力シートを開く\n' +
    '② 添付資料を追加 → ② 添付資料から入力シートを作成（AI）→ ② 入力チェック\n' +
    '③ 3 点すべて生成 → ④ AI 分析・推薦書の下書きで提案を反映 → 再生成\n\n' +
    '【シート】\n' +
    '基本情報: 履歴書の氏名・住所など\n' +
    '学歴 / 職歴: 両方の書類に使う。年は西暦4桁\n' +
    'プロジェクト: 職務経歴書の詳細。会社名は職歴と完全一致\n' +
    '経験・能力: 本文を書くか、5要素（ミッション→目標数字→課題→工夫点→結果）を埋める\n' +
    '免許・資格 / 実績 / 文章（職務要約・自己PR）\n' +
    '推薦書: 推薦先・推薦者・推薦ポイント・推薦文・面談メモ\n' +
    '添付資料: 読み取る資料の一覧（「取り込む」にチェック）\n' +
    '設定: 保存先・ファイル名パターン・テンプレート・PDF・AI\n\n' +
    '【出力】\n' +
    '生成時に保存先フォルダを聞きます（設定に書けば省略）。ファイル名は「氏名様_履歴書」形式。\n' +
    '会社規定の用紙がある場合は ⑤ でトークンを入れた用紙を作り、設定にその URL を入れると、その用紙に流し込みます。\n\n' +
    '【注意】\n' +
    'このスプレッドシートには個人情報が入ります。共有設定に注意し、GitHub 等に実データを置かないでください。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
