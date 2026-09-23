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
function chooseOutputFolder_(ss, settings, ui) {
  var configured = resolveFolder_(settings['出力フォルダ']);
  if (configured) return configured;
  var props = PropertiesService.getUserProperties();
  var last = props.getProperty('LAST_OUTPUT_FOLDER_ID');
  var lastFolder = null;
  if (last) { try { lastFolder = DriveApp.getFolderById(last); } catch (e) { lastFolder = null; } }
  if (!ui) return lastFolder || getDefaultOutputFolder_(ss);
  var res = ui.prompt('保存先フォルダ',
    'Google ドライブのフォルダ URL / ID / フォルダ名を入力してください。\n' +
    '存在しない名前ならマイドライブ直下に新規作成します。\n' +
    (lastFolder ? '空欄 → 前回と同じ「' + lastFolder.getName() + '」\n' : '空欄 → このスプレッドシートと同じ場所の「履歴書_出力」\n') +
    '（毎回聞かれたくない場合は「設定」シートの出力フォルダに入れてください）',
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
    var blob = file.getAs('application/pdf').setName(file.getName() + '.pdf');
    var old = folder.getFilesByName(file.getName() + '.pdf');
    while (old.hasNext()) old.next().setTrashed(true);
    var pdf = folder.createFile(blob);
    result.pdfUrl = pdf.getUrl();
  }
  return result;
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
