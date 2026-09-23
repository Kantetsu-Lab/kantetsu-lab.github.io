/**
 * テンプレート台帳（「テンプレート」シート）と、生成時のテンプレート選択。
 *  1 行 = 1 テンプレート。スプレッドシートの用紙は「シート名」で使うタブを指定できる
 *  （1 つのスプレッドシートに職務経歴書のテンプレートをシートごとに並べている場合など）。
 */

function templateSheet_(ss) {
  var sh = ss.getSheetByName(KL.SHEET.TEMPLATES);
  if (!sh) {
    sh = ss.insertSheet(KL.SHEET.TEMPLATES);
    sh.getRange(1, 1, 1, KL.TEMPLATE_HEADERS.length).setValues([KL.TEMPLATE_HEADERS]).setFontWeight('bold').setBackground('#e8eaed');
    sh.getRange(1, 1).setNote('履歴書 / 職務経歴書 / 推薦書');
    sh.getRange(1, 4).setNote('スプレッドシートの用紙で、使うシート（タブ）の名前。空欄ならファイル全体');
    sh.getRange(1, 5).setNote('○ を付けたものが選択ダイアログの既定になる');
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['履歴書', '職務経歴書', '推薦書'], true).setAllowInvalid(true).build();
    sh.getRange(2, 1, 200, 1).setDataValidation(rule);
    sh.setColumnWidth(1, 100).setColumnWidth(2, 220).setColumnWidth(3, 360).setColumnWidth(4, 160).setColumnWidth(5, 60);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** 台帳を読む: [{ row, kind, name, spec, sheetName, isDefault }] */
function readTemplates_(ss) {
  var sh = ss.getSheetByName(KL.SHEET.TEMPLATES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, KL.TEMPLATE_HEADERS.length).getValues().map(function (r, i) {
    return { row: i + 2, kind: nz_(r[0]), name: nz_(r[1]) || nz_(r[3]) || nz_(r[2]), spec: nz_(r[2]), sheetName: nz_(r[3]), isDefault: /^(○|〇|◯|はい|yes|true|1)$/i.test(nz_(r[4])) };
  }).filter(function (t) { return t.kind && t.spec; });
}

/** シート名・ファイル名から種別を推定（純粋関数）。分からなければ fallback */
function guessTemplateKind_(name, fallback) {
  var n = nz_(name);
  if (/推薦/.test(n)) return '推薦書';
  if (/(職務|経歴書|職歴|キャリア|CV)/i.test(n)) return '職務経歴書';
  if (/履歴/.test(n)) return '履歴書';
  return fallback || '';
}

/** 用紙を台帳に登録。スプレッドシートは各シートを 1 行ずつ。登録数を返す */
function registerTemplates_(ss, spec, fallbackKind) {
  var tpl = resolveTemplateFile_(spec);
  var sh = templateSheet_(ss);
  var existing = readTemplates_(ss).map(function (t) { return extractDriveId_(t.spec) + '#' + t.sheetName; });
  var rows = [];
  if (tpl.mime === MIME_.GSHEET) {
    SpreadsheetApp.openById(tpl.id).getSheets().forEach(function (tab) {
      rows.push([guessTemplateKind_(tab.getName(), guessTemplateKind_(tpl.name, fallbackKind)), tab.getName(), tpl.id, tab.getName(), '']);
    });
  } else {
    rows.push([guessTemplateKind_(tpl.name, fallbackKind), tpl.name.replace(/\.(docx?|xlsx?)$/i, ''), tpl.id, '', '']);
  }
  rows = rows.filter(function (r) { return existing.indexOf(r[2] + '#' + r[3]) < 0; });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, KL.TEMPLATE_HEADERS.length).setValues(rows);
  return rows.length;
}

/**
 * 生成に使うテンプレートを決める。
 *  戻り値: undefined（台帳に無い → 設定シートの値を使う）| null（標準レイアウト）| { spec, sheetName, name }
 *  台帳に 2 件以上あればダイアログで番号を選ぶ（0 = 標準レイアウト）。前回の選択を既定にする。
 */
function chooseTemplate_(ss, kind, ui) {
  var list = readTemplates_(ss).filter(function (t) { return t.kind === kind; });
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  var props = PropertiesService.getUserProperties();
  var lastKey = 'LAST_TEMPLATE_' + kind;
  var last = props.getProperty(lastKey);
  var defIdx = 0;
  list.forEach(function (t, i) { if (t.isDefault && defIdx === 0) defIdx = i + 1; });
  list.forEach(function (t, i) { if (last && last === t.spec + '#' + t.sheetName) defIdx = i + 1; });
  if (defIdx === 0) defIdx = 1;
  if (!ui) return list[defIdx - 1];
  var lines = ['0. 標準レイアウト'].concat(list.map(function (t, i) { return (i + 1) + '. ' + t.name + (i + 1 === defIdx ? '（既定）' : ''); }));
  var res = ui.prompt(kind + 'のテンプレート', lines.join('\n') + '\n\n番号を入力してください（空欄 → 既定）', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) throw new Error('キャンセルしました。');
  var v = toInt_(res.getResponseText());
  if (v === null) v = defIdx;
  if (v < 0 || v > list.length) throw new Error('番号が範囲外です: ' + res.getResponseText());
  if (v === 0) { props.setProperty(lastKey, ''); return null; }
  var chosen = list[v - 1];
  props.setProperty(lastKey, chosen.spec + '#' + chosen.sheetName);
  return chosen;
}
