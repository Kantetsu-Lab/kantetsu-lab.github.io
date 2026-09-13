/**
 * 履歴書（JIS 様式ベース、A4 縦）
 *  compose: モデル → 表示用データ（純粋関数。テスト対象）
 *  render : 表示用データ → Google ドキュメント
 */

function composeRirekisho_(model) {
  var b = model.basic;
  var rows = [];
  var blank = { y: '', m: '', text: '', align: 'left' };

  rows.push({ y: '', m: '', text: '学歴', align: 'center' });
  model.education.slice().sort(function (a, c) { return (ymKey_(a.year, a.month) || 0) - (ymKey_(c.year, c.month) || 0); })
    .forEach(function (e) {
      rows.push({ y: e.year === null ? '' : String(e.year), m: e.month === null ? '' : String(e.month), text: (e.school + ' ' + e.kind).trim(), align: 'left' });
    });
  rows.push(blank);
  rows.push({ y: '', m: '', text: '職歴', align: 'center' });
  var jobs = sortOldestFirst_(model.jobs);
  var hasCurrent = false;
  jobs.forEach(function (j) {
    var joinText = j.company + ' ' + (j.employment && j.employment !== '正社員' ? j.employment + 'として入社' : '入社');
    rows.push({ y: j.startY === null ? '' : String(j.startY), m: j.startM === null ? '' : String(j.startM), text: joinText, align: 'left' });
    if (j.endY !== null) {
      rows.push({ y: String(j.endY), m: String(j.endM), text: j.company + ' ' + (j.leaveReason || '一身上の都合により退社'), align: 'left' });
    } else {
      hasCurrent = true;
    }
  });
  if (jobs.length === 0) rows.push({ y: '', m: '', text: 'なし', align: 'left' });
  if (hasCurrent) rows.push({ y: '', m: '', text: '現在に至る', align: 'left' });
  rows.push({ y: '', m: '', text: '以上', align: 'right' });
  while (rows.length < KL.MIN_HISTORY_ROWS) rows.push(blank);

  var lic = model.licenses.filter(function (l) { return l.onRirekisho; })
    .sort(function (a, c) { return (ymKey_(a.year, a.month) || 0) - (ymKey_(c.year, c.month) || 0); })
    .map(function (l) { return { y: l.year === null ? '' : String(l.year), m: l.month === null ? '' : String(l.month), text: withAcquired_(l.name), align: 'left' }; });
  if (lic.length === 0) lic.push({ y: '', m: '', text: '特になし', align: 'left' });
  while (lic.length < KL.MIN_LICENSE_ROWS) lic.push(blank);

  var birthLine = model.birth
    ? formatJaDate_(model.birth) + '生（満 ' + model.age + ' 歳）'
    : '　　年　　月　　日生（満　　歳）';

  return {
    dateLabel: formatJaDate_(model.asOf) + ' 現在',
    kana: nz_(b['ふりがな']),
    name: nz_(b['氏名']),
    birthLine: birthLine,
    sex: nz_(b['性別']),
    addrKana: nz_(b['現住所ふりがな']),
    postal: nz_(b['郵便番号']),
    address: nz_(b['現住所']),
    tel: nz_(b['電話']),
    mobile: nz_(b['携帯']),
    email: nz_(b['メール']),
    contactKana: nz_(b['連絡先ふりがな']),
    contact: nz_(b['連絡先']) || '同上',
    historyRows: rows,
    licenseRows: lic,
    motivation: lines_(b['志望の動機・特技・アピールポイント']),
    commute: nz_(b['通勤時間']),
    dependents: nz_(b['扶養家族数']) || '0',
    spouse: nz_(b['配偶者']) || '無',
    spouseSupport: nz_(b['配偶者の扶養義務']) || '無',
    wishes: lines_(b['本人希望記入欄']),
    photoId: nz_(b['写真ファイルID'])
  };
}

function buildRirekishoDoc_(model, ss) {
  var d = composeRirekisho_(model);
  var font = model.settings['履歴書フォント'] || 'Noto Serif JP';
  var doc = newA4Doc_(outputFileName_(model, '履歴書'), font, 10);
  var body = doc.getBody();
  var base = { font: font, size: 10 };
  var label = { font: font, size: 8, bg: '#f3f3f3', align: 'center' };

  // ---- タイトル行（枠なし 2 列）
  var t = newTable_(body, 1, 2, [300, KL.CONTENT_W - 300], 0);
  setCell_(t.getRow(0).getCell(0), '履　歴　書', { font: font, size: 20, bold: true, padding: 0 });
  setCell_(t.getRow(0).getCell(1), d.dateLabel, { font: font, size: 10, align: 'right', valign: 'bottom', padding: 0 });

  // ---- 氏名ブロック（枠なし外枠: 左=情報表、右=写真）
  var photoW = 105;
  var outer = newTable_(body, 1, 2, [KL.CONTENT_W - photoW, photoW], 0);
  var left = outer.getRow(0).getCell(0);
  var right = outer.getRow(0).getCell(1);
  left.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(6);
  right.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0);
  left.getChild(0).asParagraph().editAsText().setFontSize(2);
  right.getChild(0).asParagraph().editAsText().setFontSize(2);

  var infoW = [52, 212, 40, KL.CONTENT_W - photoW - 6 - 52 - 212 - 40];
  var info = newTable_(left, 8, 4, infoW, 0.75);
  var r;
  // r0 ふりがな
  r = info.getRow(0); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(mergeCells_(r, 1, 3), d.kana, { font: font, size: 9 });
  // r1 氏名
  r = info.getRow(1); rowHeight_(r, 34);
  setCell_(r.getCell(0), '氏　名', label);
  setCell_(mergeCells_(r, 1, 3), d.name, { font: font, size: 16 });
  // r2 生年月日 / 性別
  r = info.getRow(2); rowHeight_(r, 20);
  setCell_(mergeCells_(r, 0, 1), d.birthLine, { font: font, size: 10, align: 'center' });
  setCell_(mergeCells_(r, 2, 3), '※性別　' + d.sex, { font: font, size: 9, align: 'center' });
  // r3 ふりがな（現住所） / 電話
  r = info.getRow(3); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(r.getCell(1), d.addrKana, { font: font, size: 8 });
  setCell_(r.getCell(2), '電話', label);
  setCell_(r.getCell(3), d.tel, { font: font, size: 9 });
  // r4 現住所 / 携帯
  r = info.getRow(4); rowHeight_(r, 40);
  setCell_(r.getCell(0), '現住所', label);
  setCell_(r.getCell(1), ['〒 ' + d.postal, d.address], { font: font, size: 10 });
  setCell_(r.getCell(2), '携帯', label);
  setCell_(r.getCell(3), d.mobile, { font: font, size: 9 });
  // r5 メール
  r = info.getRow(5); rowHeight_(r, 18);
  setCell_(r.getCell(0), 'E-mail', label);
  setCell_(mergeCells_(r, 1, 3), d.email, { font: font, size: 10 });
  // r6 ふりがな（連絡先）
  r = info.getRow(6); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(mergeCells_(r, 1, 3), d.contactKana, { font: font, size: 8 });
  // r7 連絡先
  r = info.getRow(7); rowHeight_(r, 36);
  setCell_(r.getCell(0), '連絡先', label);
  setCell_(mergeCells_(r, 1, 3), ['〒 （現住所以外に連絡を希望する場合のみ記入）', d.contact], { font: font, size: 9 });

  // 写真枠（30mm×40mm ≒ 85×113pt）
  var photo = newTable_(right, 1, 1, [photoW - 6], 0.75);
  var pc = photo.getRow(0).getCell(0);
  rowHeight_(photo.getRow(0), 120);
  if (d.photoId) {
    try {
      var blob = DriveApp.getFileById(d.photoId).getBlob();
      pc.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      var img = pc.getChild(0).asParagraph().appendInlineImage(blob);
      img.setWidth(85).setHeight(113);
      pc.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(2).setPaddingRight(2);
    } catch (e) {
      setCell_(pc, ['写真', '（読込失敗）', 'ID を確認'], { font: font, size: 8, align: 'center' });
    }
  } else {
    setCell_(pc, ['写真を貼る位置', '縦 40mm × 横 30mm', '本人単身、胸から上', '裏面に氏名記入'], { font: font, size: 7, align: 'center', color: '#666666' });
  }

  // ---- 学歴・職歴
  var hw = [56, 40, KL.CONTENT_W - 96];
  var hist = newTable_(body, d.historyRows.length + 1, 3, hw, 0.75);
  var hr = hist.getRow(0); rowHeight_(hr, 18);
  setCell_(hr.getCell(0), '年', label);
  setCell_(hr.getCell(1), '月', label);
  setCell_(hr.getCell(2), '学歴・職歴（各別にまとめて書く）', label);
  d.historyRows.forEach(function (row, i) {
    var tr = hist.getRow(i + 1); rowHeight_(tr, 20);
    setCell_(tr.getCell(0), row.y, { font: font, size: 10, align: 'center' });
    setCell_(tr.getCell(1), row.m, { font: font, size: 10, align: 'center' });
    setCell_(tr.getCell(2), row.text, { font: font, size: 10, align: row.align });
  });

  addPara_(body, '', { size: 6 });

  // ---- 免許・資格
  var lic = newTable_(body, d.licenseRows.length + 1, 3, hw, 0.75);
  var lr = lic.getRow(0); rowHeight_(lr, 18);
  setCell_(lr.getCell(0), '年', label);
  setCell_(lr.getCell(1), '月', label);
  setCell_(lr.getCell(2), '免許・資格', label);
  d.licenseRows.forEach(function (row, i) {
    var tr = lic.getRow(i + 1); rowHeight_(tr, 20);
    setCell_(tr.getCell(0), row.y, { font: font, size: 10, align: 'center' });
    setCell_(tr.getCell(1), row.m, { font: font, size: 10, align: 'center' });
    setCell_(tr.getCell(2), row.text, { font: font, size: 10, align: row.align });
  });

  addPara_(body, '', { size: 6 });

  // ---- 志望の動機
  var mot = newTable_(body, 1, 1, [KL.CONTENT_W], 0.75);
  var mc = mot.getRow(0).getCell(0);
  rowHeight_(mot.getRow(0), 120);
  setCell_(mc, ['志望の動機、特技、好きな学科、アピールポイントなど'].concat(d.motivation.length ? d.motivation : ['']), { font: font, size: 10, valign: 'top' });
  mc.getChild(0).asParagraph().editAsText().setFontSize(8).setForegroundColor('#555555');

  // ---- 通勤時間 / 扶養家族 / 配偶者 / 扶養義務
  var misc = newTable_(body, 1, 4, [KL.CONTENT_W / 4, KL.CONTENT_W / 4, KL.CONTENT_W / 4, KL.CONTENT_W / 4], 0.75);
  var mr = misc.getRow(0); rowHeight_(mr, 36);
  [['通勤時間', d.commute], ['扶養家族数（配偶者を除く）', d.dependents + ' 人'], ['配偶者', d.spouse], ['配偶者の扶養義務', d.spouseSupport]]
    .forEach(function (pair, i) {
      var c = mr.getCell(i);
      setCell_(c, [pair[0], pair[1]], { font: font, size: 10, align: 'center' });
      c.getChild(0).asParagraph().editAsText().setFontSize(7).setForegroundColor('#555555');
    });

  // ---- 本人希望記入欄
  var wish = newTable_(body, 1, 1, [KL.CONTENT_W], 0.75);
  var wc = wish.getRow(0).getCell(0);
  rowHeight_(wish.getRow(0), 70);
  setCell_(wc, ['本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）'].concat(d.wishes.length ? d.wishes : ['']), { font: font, size: 10, valign: 'top' });
  wc.getChild(0).asParagraph().editAsText().setFontSize(8).setForegroundColor('#555555');

  var folder = getOutputFolder_(ss, model.settings);
  return finalizeDoc_(doc, folder, model.settings);
}
