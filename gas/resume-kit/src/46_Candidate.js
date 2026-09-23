/**
 * 新規作成: 任意の親フォルダーに「〇〇様」フォルダー（＋添付資料フォルダー）を作り、
 * このスプレッドシート（スクリプトごと）を「〇〇様_入力シート」として複製して入れる。
 * 複製側は入力データを空にし、保存先・添付先を「〇〇様」フォルダーに設定済みにする。
 * 設定（テンプレート・フォント・AI など）は引き継ぐ。
 */


function createCandidate_(ss, personName, parent) {
  var settings = loadModel(ss).settings;
  var folderName = candidateFolderName_(settings, personName);
  var folder = getOrCreateSubfolder_(parent, folderName);
  var attach = getOrCreateSubfolder_(folder, '添付資料');

  var copyName = folderName + '_入力シート';
  var existing = folder.getFilesByName(copyName);
  if (existing.hasNext()) {
    var f = existing.next();
    return { folder: folder, attach: attach, ssId: f.getId(), ssUrl: f.getUrl(), reused: true };
  }
  var copy = DriveApp.getFileById(ss.getId()).makeCopy(copyName, folder);
  var cs = SpreadsheetApp.openById(copy.getId());
  resetCandidateSheet_(cs, personName, folder, attach);
  return { folder: folder, attach: attach, ssId: copy.getId(), ssUrl: copy.getUrl(), reused: false };
}

/** 複製したスプレッドシートを空の入力シートにする */
function resetCandidateSheet_(cs, personName, folder, attach) {
  setupSheets_(cs, false);
  // 表形式シートはデータ行を消す
  [KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS, KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS, KL.SHEET.ATTACH]
    .forEach(function (name) {
      var sh = cs.getSheetByName(name);
      if (!sh) return;
      var last = sh.getLastRow();
      var cols = Math.max(sh.getLastColumn(), 1);
      if (last >= 2) sh.getRange(2, 1, last - 1, cols).clearContent();
    });
  // 項目 / 値 形式は値を既定に戻す（推薦者欄は会社として共通なので残す）
  var keep = { '推薦者会社': true, '推薦者部署・役職': true, '推薦者氏名': true, '推薦者連絡先': true };
  [[KL.SHEET.BASIC, KL.BASIC_KEYS], [KL.SHEET.TEXTS, KL.TEXT_KEYS], [KL.SHEET.SUISEN, KL.SUISEN_KEYS]].forEach(function (pair) {
    var sh = cs.getSheetByName(pair[0]);
    var defaults = {};
    pair[1].forEach(function (k) { defaults[k[0]] = k[1]; });
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var key = nz_(rows[i][0]);
      if (key in defaults && !keep[key]) sh.getRange(i + 1, 2).setValue(defaults[key]);
    }
  });
  writeKv_(cs, KL.SHEET.BASIC, '氏名', personName);
  writeKv_(cs, KL.SHEET.SETTINGS, '出力フォルダ', folder.getId());
  writeKv_(cs, KL.SHEET.SETTINGS, '添付フォルダ', attach.getId());
  // 作業用シートは消す
  [KL.SHEET.CHECK, KL.SHEET.AI, KL.SHEET.IMPORT, 'AI提案', 'トークン一覧'].forEach(function (n) {
    var sh = cs.getSheetByName(n);
    if (sh) cs.deleteSheet(sh);
  });
}

/** 項目 / 値 形式のシートの値を書く（行が無ければ追加） */
function writeKv_(ss, sheetName, key, value) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (nz_(rows[i][0]) === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, 2).setValues([[key, value]]);
}

/** 添付フォルダ（設定 → 出力フォルダ/〇〇様/添付資料）。ui があれば保存先を聞く */
function ensureAttachFolder_(ss, model, ui) {
  var configured = resolveFolder_(model.settings['添付フォルダ']);
  if (configured) return configured;
  var name = nz_(model.basic['氏名']);
  if (!name) throw new Error('先に「基本情報」の氏名を入力するか、「⓪ 新規候補者を作成」で候補者フォルダーを作ってください。');
  var folder = chooseOutputFolder_(ss, model.settings, ui, name);
  if (!folder) return null;
  var attach = getOrCreateSubfolder_(folder, '添付資料');
  writeKv_(ss, KL.SHEET.SETTINGS, '添付フォルダ', attach.getId());
  return attach;
}
