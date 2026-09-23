/**
 * 添付資料: PC からのアップロード（ファイル / フォルダー）と、ドライブ上のファイル・フォルダーの登録。
 * 読み取り: Google ドキュメント / スプレッドシート / スライド、Word / Excel / PowerPoint（変換）、
 *           テキスト・CSV、PDF・画像（AI に直接渡す。大きすぎる場合は Drive の OCR）。
 */

var MIME_EXTRA_ = {
  GSLIDES: 'application/vnd.google-apps.presentation',
  FOLDER: 'application/vnd.google-apps.folder',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PPT: 'application/vnd.ms-powerpoint',
  PDF: 'application/pdf'
};

// ---------------- 添付資料シート

function attachSheet_(ss) {
  var sh = ss.getSheetByName(KL.SHEET.ATTACH);
  if (!sh) {
    sh = ss.insertSheet(KL.SHEET.ATTACH);
    sh.getRange(1, 1, 1, KL.ATTACH_HEADERS.length).setValues([KL.ATTACH_HEADERS]).setFontWeight('bold').setBackground('#e8eaed');
    sh.setColumnWidth(1, 60).setColumnWidth(2, 260).setColumnWidth(3, 120).setColumnWidth(4, 120).setColumnWidth(5, 220).setColumnWidth(6, 100).setColumnWidth(7, 220);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** 添付を 1 件登録（同じ ID は登録しない）。登録したら true */
function registerAttachment_(ss, file, where) {
  var sh = attachSheet_(ss);
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 4, last - 1, 1).getValues().map(function (r) { return nz_(r[0]); });
    if (ids.indexOf(file.getId()) >= 0) return false;
  }
  var r = last + 1;
  sh.getRange(r, 1, 1, KL.ATTACH_HEADERS.length).setValues([[true, file.getName(), mimeLabel_(file.getMimeType()), file.getId(), where || '', formatIsoDate_(new Date()), '未読']]);
  sh.getRange(r, 1).insertCheckboxes();
  return true;
}

function mimeLabel_(mime) {
  var map = {};
  map[MIME_.GDOC] = 'Googleドキュメント'; map[MIME_.GSHEET] = 'Googleスプレッドシート'; map[MIME_EXTRA_.GSLIDES] = 'Googleスライド';
  map[MIME_.DOCX] = 'Word'; map[MIME_.DOC] = 'Word'; map[MIME_.XLSX] = 'Excel'; map[MIME_.XLS] = 'Excel';
  map[MIME_EXTRA_.PPTX] = 'PowerPoint'; map[MIME_EXTRA_.PPT] = 'PowerPoint'; map[MIME_EXTRA_.PDF] = 'PDF';
  if (map[mime]) return map[mime];
  if (/^image\//.test(mime)) return '画像';
  if (/^text\/|json|csv/.test(mime)) return 'テキスト';
  return mime;
}

/** 取り込み対象（チェックあり）の行 */
function checkedAttachments_(ss) {
  var sh = ss.getSheetByName(KL.SHEET.ATTACH);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, KL.ATTACH_HEADERS.length).getValues()
    .map(function (r, i) { return { row: i + 2, checked: r[0] === true, name: nz_(r[1]), id: nz_(r[3]) }; })
    .filter(function (x) { return x.checked && x.id; });
}

function setAttachStatus_(ss, row, status) {
  ss.getSheetByName(KL.SHEET.ATTACH).getRange(row, 7).setValue(status);
}

// ---------------- ダイアログから呼ばれる（google.script.run で呼ぶため末尾 _ なし）

/** PC からのアップロード 1 件。obj: { name, mime, data(base64), path(相対パス。フォルダー添付時) } */
function uploadAttachment(obj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var root = resolveFolder_(model.settings['添付フォルダ']);
  if (!root) throw new Error('添付フォルダが未設定です。メニューから開き直してください。');
  var dir = root;
  var parts = nz_(obj.path).split('/').filter(function (x) { return x; });
  parts.pop(); // ファイル名
  parts.forEach(function (p) { dir = getOrCreateSubfolder_(dir, p); });
  var bytes = Utilities.base64Decode(obj.data);
  if (bytes.length > KL.ATTACH_LIMITS.UPLOAD_PER_FILE) throw new Error(obj.name + ' は大きすぎます（15MB まで）。ドライブに置いて URL で登録してください。');
  var file = dir.createFile(Utilities.newBlob(bytes, obj.mime || 'application/octet-stream', obj.name));
  registerAttachment_(ss, file, parts.length ? parts.join('/') : 'アップロード');
  return file.getName();
}

/** ドライブの URL / ID（改行区切り）を登録。フォルダーは中身を再帰的に登録。登録件数を返す */
function addDriveAttachments(text) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var count = 0;
  nz_(text).split(/[\s,]+/).map(extractDriveId_).filter(function (x) { return x; }).forEach(function (id) {
    var folder = null;
    try { folder = DriveApp.getFolderById(id); } catch (e) { folder = null; }
    if (folder) {
      listFolderFiles_(folder, folder.getName(), KL.ATTACH_LIMITS.FILES_PER_FOLDER).forEach(function (x) {
        if (registerAttachment_(ss, x.file, x.path)) count++;
      });
      return;
    }
    var file = DriveApp.getFileById(id); // 見つからなければ例外 → ダイアログに表示
    if (registerAttachment_(ss, file, 'ドライブ')) count++;
  });
  return count;
}

function listFolderFiles_(folder, path, limit) {
  var out = [];
  var files = folder.getFiles();
  while (files.hasNext() && out.length < limit) out.push({ file: files.next(), path: path });
  var subs = folder.getFolders();
  while (subs.hasNext() && out.length < limit) {
    var sub = subs.next();
    out = out.concat(listFolderFiles_(sub, path + '/' + sub.getName(), limit - out.length));
  }
  return out;
}

// ---------------- 読み取り

/**
 * 1 ファイルを読み取る。
 * 戻り値: { kind: 'text', text } | { kind: 'inline', mime, data(base64), size } | { kind: 'skip', reason }
 * inlineOk: PDF・画像を AI に直接渡せるか（プロバイダと残り容量で決まる）
 */
function readAttachment_(fileId, inlineOk) {
  var file = DriveApp.getFileById(fileId);
  var mime = file.getMimeType();
  var cap = KL.ATTACH_LIMITS.TEXT_PER_FILE;
  if (mime === MIME_.GDOC) return { kind: 'text', text: DocumentApp.openById(fileId).getBody().getText().slice(0, cap) };
  if (mime === MIME_.GSHEET) return { kind: 'text', text: sheetText_(SpreadsheetApp.openById(fileId)).slice(0, cap) };
  if (mime === MIME_EXTRA_.GSLIDES) return { kind: 'text', text: exportText_(fileId, 'text/plain').slice(0, cap) };
  if ([MIME_.DOCX, MIME_.DOC, MIME_.XLSX, MIME_.XLS, MIME_EXTRA_.PPTX, MIME_EXTRA_.PPT].indexOf(mime) >= 0) {
    return { kind: 'text', text: convertAndRead_(file, mime).slice(0, cap) };
  }
  if (mime === MIME_EXTRA_.FOLDER) return { kind: 'skip', reason: 'フォルダー' };
  var blob = file.getBlob();
  if (/^text\/|json|csv|xml/.test(mime)) return { kind: 'text', text: decodeText_(blob).slice(0, cap) };
  if (mime === MIME_EXTRA_.PDF || /^image\//.test(mime)) {
    var size = blob.getBytes().length;
    if (inlineOk(mime, size)) return { kind: 'inline', mime: mime, data: Utilities.base64Encode(blob.getBytes()), size: size };
    return { kind: 'text', text: ocrRead_(file).slice(0, cap) };
  }
  return { kind: 'skip', reason: '未対応の形式（' + mime + '）' };
}

function sheetText_(ss) {
  return ss.getSheets().map(function (sh) {
    var rows = sh.getDataRange().getValues().map(function (r) { return r.map(nz_).join('\t').replace(/\t+$/, ''); })
      .filter(function (x) { return x !== ''; });
    return '# ' + sh.getName() + '\n' + rows.join('\n');
  }).join('\n\n');
}

/** Shift_JIS の CSV 等も読めるように */
function decodeText_(blob) {
  var t = blob.getDataAsString('UTF-8');
  if (t.indexOf('�') >= 0) {
    try { t = blob.getDataAsString('Shift_JIS'); } catch (e) { /* keep */ }
  }
  return t;
}

/** Google 形式のファイルをテキストで書き出す（Drive API v3 export） */
function exportText_(fileId, mime) {
  var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=' + encodeURIComponent(mime), {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('テキスト書き出しに失敗 (' + res.getResponseCode() + ')');
  return res.getContentText();
}

function requireDriveApi_() {
  if (typeof Drive === 'undefined') {
    throw new Error('Word / Excel / PowerPoint の変換と OCR には Drive API（高度なサービス）が必要です。appsscript.json を README の内容に置き換えてください。');
  }
}

/** Office ファイルを一時的に Google 形式へ変換して読み、一時ファイルはゴミ箱へ */
function convertAndRead_(file, mime) {
  requireDriveApi_();
  var target = (mime === MIME_.XLSX || mime === MIME_.XLS) ? MIME_.GSHEET
    : (mime === MIME_EXTRA_.PPTX || mime === MIME_EXTRA_.PPT) ? MIME_EXTRA_.GSLIDES : MIME_.GDOC;
  var tmp = Drive.Files.create({ name: '_tmp_' + file.getName(), mimeType: target }, file.getBlob(), { supportsAllDrives: true });
  try {
    if (target === MIME_.GDOC) return DocumentApp.openById(tmp.id).getBody().getText();
    if (target === MIME_.GSHEET) return sheetText_(SpreadsheetApp.openById(tmp.id));
    return exportText_(tmp.id, 'text/plain');
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
}

/** PDF・画像を Drive の OCR（日本語）でテキスト化 */
function ocrRead_(file) {
  requireDriveApi_();
  var tmp = Drive.Files.create({ name: '_ocr_' + file.getName(), mimeType: MIME_.GDOC }, file.getBlob(), { ocrLanguage: 'ja', supportsAllDrives: true });
  try {
    return DocumentApp.openById(tmp.id).getBody().getText();
  } finally {
    DriveApp.getFileById(tmp.id).setTrashed(true);
  }
}

/** PDF・画像を AI に直接渡せる形式か（プロバイダ別） */
function inlineSupported_(provider, mime) {
  if (mime === MIME_EXTRA_.PDF) return true;
  if (provider === 'claude') return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].indexOf(mime) >= 0;
  return /^image\/(jpeg|png|webp|heic|heif)$/.test(mime);
}

/**
 * チェックの付いた添付をまとめて読む。
 * 戻り値: { parts: [{text} | {inline:{mime,data}}], sources: [ファイル名], errors: [..] }
 */
function collectAttachmentParts_(ss, settings) {
  var provider = (nz_(settings['AIプロバイダ']) || 'gemini').toLowerCase();
  var items = checkedAttachments_(ss);
  var parts = [], sources = [], errors = [];
  var inlineUsed = 0, textUsed = 0;
  items.forEach(function (it) {
    try {
      var r = readAttachment_(it.id, function (mime, size) {
        if (!inlineSupported_(provider, mime)) return false;
        if (size > KL.ATTACH_LIMITS.INLINE_PER_FILE || inlineUsed + size > KL.ATTACH_LIMITS.INLINE_TOTAL) return false;
        inlineUsed += size;
        return true;
      });
      if (r.kind === 'skip') { setAttachStatus_(ss, it.row, '対象外: ' + r.reason); return; }
      if (r.kind === 'text') {
        var text = r.text.slice(0, Math.max(KL.ATTACH_LIMITS.TEXT_TOTAL - textUsed, 0));
        textUsed += text.length;
        parts.push({ text: '===== 資料: ' + it.name + ' =====\n' + text });
        setAttachStatus_(ss, it.row, '読み取り済（' + text.length + '字）');
      } else {
        parts.push({ text: '===== 資料: ' + it.name + '（次の添付ファイル） =====' });
        parts.push({ inline: { mime: r.mime, data: r.data } });
        setAttachStatus_(ss, it.row, 'AI に直接渡す（' + Math.round(r.size / 1024) + 'KB）');
      }
      sources.push(it.name);
    } catch (e) {
      errors.push(it.name + ': ' + (e.message || e));
      setAttachStatus_(ss, it.row, 'エラー: ' + (e.message || e));
    }
  });
  return { parts: parts, sources: sources, errors: errors };
}

// ---------------- アップロード用ダイアログ

function attachDialogHtml_(folderName) {
  return [
    '<style>body{font:13px/1.6 sans-serif;margin:12px}h3{margin:14px 0 6px;font-size:14px}textarea{width:100%;height:70px}',
    '#log{white-space:pre-wrap;background:#f6f6f6;padding:8px;height:130px;overflow:auto;font-size:12px}button{margin-top:6px}</style>',
    '<div>保存先: <b>' + String(folderName).replace(/[<>&"]/g, '') + '</b></div>',
    '<h3>PC のファイル</h3><input type="file" id="files" multiple>',
    '<h3>PC のフォルダー（中身ごと）</h3><input type="file" id="dir" webkitdirectory multiple>',
    '<div><button onclick="up()">アップロード</button></div>',
    '<h3>ドライブのファイル / フォルダー（URL か ID、改行区切り）</h3><textarea id="urls"></textarea>',
    '<div><button onclick="reg()">登録</button> <button onclick="google.script.host.close()">閉じる</button></div>',
    '<h3>状況</h3><div id="log"></div>',
    '<script>',
    'var MAX=' + KL.ATTACH_LIMITS.UPLOAD_PER_FILE + ';',
    'function log(s){var l=document.getElementById("log");l.textContent+=s+"\\n";l.scrollTop=l.scrollHeight;}',
    'function read(f){return new Promise(function(ok,ng){var r=new FileReader();r.onload=function(){ok(String(r.result).split(",")[1]||"");};r.onerror=ng;r.readAsDataURL(f);});}',
    'function call(fn,arg){return new Promise(function(ok,ng){google.script.run.withSuccessHandler(ok).withFailureHandler(ng)[fn](arg);});}',
    'async function up(){var fs=[].slice.call(document.getElementById("files").files).concat([].slice.call(document.getElementById("dir").files));',
    ' if(!fs.length){log("ファイルが選ばれていません");return;}',
    ' for(var i=0;i<fs.length;i++){var f=fs[i];if(f.size>MAX){log("× "+f.name+"（15MB 超。ドライブに置いて URL で登録）");continue;}',
    '  try{var d=await read(f);var n=await call("uploadAttachment",{name:f.name,mime:f.type,data:d,path:f.webkitRelativePath||""});log("○ "+n);}',
    '  catch(e){log("× "+f.name+": "+(e&&e.message||e));}}',
    ' log("完了。「添付資料」シートで取り込む資料を確認してください。");}',
    'async function reg(){var t=document.getElementById("urls").value;if(!t.trim())return;',
    ' try{var n=await call("addDriveAttachments",t);log("○ "+n+" 件登録");}catch(e){log("× "+(e&&e.message||e));}}',
    '</script>'
  ].join('\n');
}
