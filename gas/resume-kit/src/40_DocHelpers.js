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

/** 行の cell[from..to] を水平結合して結合後のセルを返す */
function mergeCells_(row, from, to) {
  for (var i = to; i > from; i--) {
    row.getCell(from + 1).merge();
  }
  return row.getCell(from);
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

/** 出力フォルダ（設定 or スプレッドシートと同じ場所に自動作成） */
function getOutputFolder_(ss, settings) {
  var id = nz_(settings['出力フォルダID']);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* fallthrough */ }
  }
  var file = DriveApp.getFileById(ss.getId());
  var parents = file.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var existing = parent.getFoldersByName('履歴書_出力');
  if (existing.hasNext()) return existing.next();
  return parent.createFolder('履歴書_出力');
}

/** ドキュメントをフォルダへ移動し、必要なら PDF も出す。 { doc, pdf } の URL を返す */
function finalizeDoc_(doc, folder, settings) {
  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  var result = { docUrl: doc.getUrl(), pdfUrl: '' };
  if (/^(はい|yes|true|1)$/i.test(nz_(settings['PDFも出力']))) {
    var blob = file.getAs('application/pdf').setName(file.getName() + '.pdf');
    var old = folder.getFilesByName(file.getName() + '.pdf');
    while (old.hasNext()) old.next().setTrashed(true);
    var pdf = folder.createFile(blob);
    result.pdfUrl = pdf.getUrl();
  }
  return result;
}

function outputFileName_(model, kind) {
  var prefix = nz_(model.settings['ファイル名の接頭辞']);
  return prefix + kind + '_' + nameForFile_(model.basic['氏名']) + '_' + formatCompactDate_(model.asOf);
}
