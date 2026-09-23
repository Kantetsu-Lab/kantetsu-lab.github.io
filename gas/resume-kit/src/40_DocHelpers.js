/**
 * DocumentApp の薄いラッパー。レイアウトの共通処理をまとめる。
 */

function newA4Doc_(name, font, fontSize) {
  var doc = DocumentApp.create(name);
  var body = doc.getBody();
  body.setPageWidth(KL.PAGE.W).setPageHeight(KL.PAGE.H);
  body.setMarginTop(KL.PAGE.MARGIN).setMarginBottom(KL.PAGE.MARGIN)
    .setMarginLeft(KL.PAGE.MARGIN).setMarginRight(KL.PAGE.MARGIN);
  var attrs = {};
  attrs[DocumentApp.Attribute.FONT_FAMILY] = font;
  attrs[DocumentApp.Attribute.FONT_SIZE] = fontSize;
  attrs[DocumentApp.Attribute.LINE_SPACING] = 1.15;
  attrs[DocumentApp.Attribute.SPACING_BEFORE] = 0;
  attrs[DocumentApp.Attribute.SPACING_AFTER] = 0;
  body.setAttributes(attrs);
  // 新規ドキュメントの先頭にある空段落は小さくしておく
  var first = body.getChild(0);
  if (first && first.getType() === DocumentApp.ElementType.PARAGRAPH) {
    first.asParagraph().editAsText().setFontSize(4);
  }
  return doc;
}

/** 段落を追加してスタイル適用 */
function addPara_(container, text, opt) {
  opt = opt || {};
  var p = container.appendParagraph(text || '');
  styleParagraph_(p, opt);
  return p;
}

function styleParagraph_(p, opt) {
  opt = opt || {};
  var t = p.editAsText();
  if (opt.font) t.setFontFamily(opt.font);
  if (opt.size) t.setFontSize(opt.size);
  t.setBold(!!opt.bold);
  if (opt.color) t.setForegroundColor(opt.color);
  if (opt.align === 'center') p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  else if (opt.align === 'right') p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  else p.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  p.setSpacingBefore(opt.before || 0);
  p.setSpacingAfter(opt.after || 0);
  if (opt.lineSpacing) p.setLineSpacing(opt.lineSpacing);
  if (opt.indent) p.setIndentStart(opt.indent);
  return p;
}

/**
 * セルに複数行テキストを書き込む（1行目は既存段落、2行目以降は段落追加）。
 * lines: string | string[]。opt: { size, bold, align, font, bg, valign, padding }
 */
function setCell_(cell, lines, opt) {
  opt = opt || {};
  if (!Array.isArray(lines)) lines = [lines === null || lines === undefined ? '' : String(lines)];
  if (lines.length === 0) lines = [''];
  // 結合したセルには空段落が残るので 1 つにしてから書く
  while (cell.getNumChildren() > 1) cell.removeChild(cell.getChild(cell.getNumChildren() - 1));
  var first = cell.getChild(0).asParagraph();
  first.setText(lines[0]);
  styleParagraph_(first, opt);
  for (var i = 1; i < lines.length; i++) {
    addPara_(cell, lines[i], opt);
  }
  var pad = opt.padding === undefined ? 3 : opt.padding;
  cell.setPaddingTop(pad).setPaddingBottom(pad).setPaddingLeft(pad + 2).setPaddingRight(pad + 2);
  if (opt.bg) cell.setBackgroundColor(opt.bg);
  var va = opt.valign === 'top' ? DocumentApp.VerticalAlignment.TOP
    : opt.valign === 'bottom' ? DocumentApp.VerticalAlignment.BOTTOM
    : DocumentApp.VerticalAlignment.CENTER;
  cell.setVerticalAlignment(va);
  return cell;
}

/** 空のテーブルを作る（rows x cols）。widths は列幅(pt)配列 */
function newTable_(container, rows, cols, widths, borderWidth) {
  var cells = [];
  for (var r = 0; r < rows; r++) {
    var row = [];
    for (var c = 0; c < cols; c++) row.push('');
    cells.push(row);
  }
  var table = container.appendTable(cells);
  table.setBorderWidth(borderWidth === undefined ? 0.75 : borderWidth);
  table.setBorderColor('#000000');
  if (widths) {
    for (var i = 0; i < widths.length; i++) table.setColumnWidth(i, widths[i]);
  }
  return table;
}

/** コンテナ末尾の空段落（表の直後に自動で入るもの）を最小化する */
function shrinkTrailingGap_(container) {
  var n = container.getNumChildren();
  if (n === 0) return;
  var last = container.getChild(n - 1);
  if (last.getType() !== DocumentApp.ElementType.PARAGRAPH) return;
  var p = last.asParagraph();
  if (p.getText() !== '') return;
  p.editAsText().setFontSize(1);
  p.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
}

/** 直前の表と隙間なく積む表（間に自動で入る空段落を最小化してから追加） */
function newStackedTable_(container, rows, cols, widths, borderWidth) {
  shrinkTrailingGap_(container);
  return newTable_(container, rows, cols, widths, borderWidth);
}

/** 行の最小高さを設定 */
function rowHeight_(row, pt) {
  row.setMinimumHeight(pt);
  return row;
}

/** 見出し（■）段落 */
function addSectionHeading_(body, text, font) {
  var p = addPara_(body, '■' + text, { font: font, size: 11, bold: true, before: 12, after: 4 });
  return p;
}

/** URL / ID / 名前 からフォルダを解決。名前は「マイドライブ直下 → 全体検索」の順。無ければ null */
function resolveFolder_(spec) {
  spec = nz_(spec);
  if (!spec) return null;
  var id = extractDriveId_(spec);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* not a folder id */ }
  }
  var it = DriveApp.getRootFolder().getFoldersByName(spec);
  if (it.hasNext()) return it.next();
  it = DriveApp.getFoldersByName(spec);
  if (it.hasNext()) return it.next();
  return null;
}

/** Drive の URL / ID から ID を取り出す */
function extractDriveId_(s) {
  s = nz_(s);
  var m = s.match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

/** 保存先フォルダを決める。設定 → 前回の選択（ユーザープロパティ）→ ダイアログ の順 */
function chooseOutputFolder_(ss, settings, ui, personName) {
  var parent = chooseParentFolder_(ss, settings, ui);
  if (!parent || !personName) return parent;
  return candidateFolderIn_(parent, settings, personName);
}

/** 保存先（親）を決める。設定 → 前回の選択（ユーザープロパティ）→ ダイアログ の順 */
function chooseParentFolder_(ss, settings, ui, opts) {
  opts = opts || {};
  var configured = resolveFolder_(settings['出力フォルダ']);
  if (configured && !opts.alwaysAsk) return configured;
  var props = PropertiesService.getUserProperties();
  var last = props.getProperty('LAST_OUTPUT_FOLDER_ID');
  var lastFolder = configured;
  if (!lastFolder && last) { try { lastFolder = DriveApp.getFolderById(last); } catch (e) { lastFolder = null; } }
  if (!ui) return lastFolder || getDefaultOutputFolder_(ss);
  var res = ui.prompt(opts.title || '保存先フォルダ',
    (opts.lead ? opts.lead + '\n' : '') +
    'Google ドライブのフォルダ URL / ID / フォルダ名を入力してください。\n' +
    '存在しない名前ならマイドライブ直下に新規作成します。\n' +
    (lastFolder ? '空欄 → 「' + lastFolder.getName() + '」\n' : '空欄 → このスプレッドシートと同じ場所の「履歴書_出力」\n') +
    (opts.alwaysAsk ? '' : '（毎回聞かれたくない場合は「設定」シートの出力フォルダに入れてください）'),
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  var spec = nz_(res.getResponseText());
  var folder;
  if (!spec) folder = lastFolder || getDefaultOutputFolder_(ss);
  else {
    folder = resolveFolder_(spec);
    if (!folder) {
      if (/^https?:\/\//.test(spec) || /^[-\w]{25,}$/.test(spec)) throw new Error('フォルダが見つからないか、アクセス権がありません: ' + spec);
      folder = DriveApp.getRootFolder().createFolder(spec);
    }
  }
  props.setProperty('LAST_OUTPUT_FOLDER_ID', folder.getId());
  return folder;
}

/** 候補者フォルダー名（設定「候補者フォルダー名」、既定 {氏名}様） */
function candidateFolderName_(settings, personName, asOf) {
  var pattern = nz_(settings['候補者フォルダー名']) || '{氏名}様';
  return pattern.replace(/\{氏名\}/g, nz_(personName)).replace(/\{日付\}/g, formatCompactDate_(asOf || new Date()))
    .replace(/[\\\/:*?"<>|]/g, '_');
}

/** 親フォルダーの中の「〇〇様」を返す（無ければ作る）。親がすでに「〇〇様」ならそのまま */
function candidateFolderIn_(parent, settings, personName) {
  if (!/^(はい|yes|true|1)$/i.test(nz_(settings['氏名様フォルダーを作る']) || 'はい')) return parent;
  var name = candidateFolderName_(settings, personName);
  if (parent.getName() === name) return parent;
  return getOrCreateSubfolder_(parent, name);
}

function getOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/** スプレッドシートと同じ場所の「履歴書_出力」 */
function getDefaultOutputFolder_(ss) {
  var file = DriveApp.getFileById(ss.getId());
  var parents = file.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var existing = parent.getFoldersByName('履歴書_出力');
  if (existing.hasNext()) return existing.next();
  return parent.createFolder('履歴書_出力');
}

/** 生成ファイル（ドキュメント/スプレッドシート）をフォルダへ移動し、必要なら PDF も出す */
function finalizeFile_(fileId, url, folder, settings) {
  var file = DriveApp.getFileById(fileId);
  file.moveTo(folder);
  var result = { docUrl: url, pdfUrl: '' };
  if (/^(はい|yes|true|1)$/i.test(nz_(settings['PDFも出力']))) {
    var blob = (file.getMimeType() === MIME_.GSHEET ? exportSheetPdf_(fileId) : file.getAs('application/pdf')).setName(file.getName() + '.pdf');
    var old = folder.getFilesByName(file.getName() + '.pdf');
    while (old.hasNext()) old.next().setTrashed(true);
    var pdf = folder.createFile(blob);
    result.pdfUrl = pdf.getUrl();
  }
  return result;
}

/**
 * スプレッドシートを PDF に（A4・幅に合わせる・枠線なし）。
 * getAs は既定の印刷設定（縦・枠線あり）になるため、書き出し URL で向きと倍率を指定する。
 * 向きは最初のシートの使用範囲の縦横比で決める。
 */
function exportSheetPdf_(ssId) {
  var sh = SpreadsheetApp.openById(ssId).getSheets()[0];
  var cols = Math.max(sh.getLastColumn(), 1), rows = Math.max(sh.getLastRow(), 1);
  var w = 0, h = 0;
  for (var c = 1; c <= cols; c++) w += sh.getColumnWidth(c);
  for (var r = 1; r <= rows; r++) h += sh.getRowHeight(r);
  var portrait = pdfPortrait_(w, h);
  var url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=pdf&size=A4&portrait=' + portrait +
    '&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false' +
    '&top_margin=0.4&bottom_margin=0.4&left_margin=0.4&right_margin=0.4&gid=' + sh.getSheetId();
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('PDF の書き出しに失敗しました (' + res.getResponseCode() + ')');
  return res.getBlob();
}

/** 使用範囲の縦横比 → 縦向きか（純粋関数）。横長なら横向き */
function pdfPortrait_(width, height) {
  return !(width > height * 1.05);
}

/** 会社フッター（設定「会社フッター」「会社ロゴファイルID」）を入れる */
function addCompanyFooter_(doc, settings, font) {
  var lines = lines_(settings['会社フッター']);
  var logoId = extractDriveId_(settings['会社ロゴファイルID']);
  if (!lines.length && !logoId) return;
  var footer = doc.getFooter() || doc.addFooter();
  var first = footer.getNumChildren() ? footer.getChild(0).asParagraph() : footer.appendParagraph('');
  lines.forEach(function (l, i) {
    var p = i === 0 ? first : footer.appendParagraph('');
    p.setText(l);
    styleParagraph_(p, { font: font, size: 8, color: '#777777' });
  });
  if (logoId) {
    try {
      var lp = lines.length ? footer.appendParagraph('') : first;
      styleParagraph_(lp, { align: 'right' });
      var img = lp.appendInlineImage(DriveApp.getFileById(logoId).getBlob());
      var w = img.getWidth(), h = img.getHeight();
      if (h > 0) img.setHeight(36).setWidth(Math.round(w * 36 / h));
    } catch (e) { /* ロゴが読めなければ文字だけ */ }
  }
}

function finalizeDoc_(doc, folder, settings) {
  doc.saveAndClose();
  return finalizeFile_(doc.getId(), doc.getUrl(), folder, settings);
}

/** ファイル名: 設定「ファイル名パターン」({氏名} {種別} {日付}) */
function outputFileName_(model, kind) {
  var pattern = nz_(model.settings['ファイル名パターン']) || '{氏名}様_{種別}';
  // 種別が無いと履歴書と職務経歴書が同名になり、PDF の上書きで互いを消してしまう
  if (pattern.indexOf('{種別}') < 0) pattern += '_{種別}';
  return pattern
    .replace(/\{氏名\}/g, nz_(model.basic['氏名']))
    .replace(/\{種別\}/g, kind)
    .replace(/\{日付\}/g, formatCompactDate_(model.asOf))
    .replace(/[\\\/:*?"<>|]/g, '_');
}
