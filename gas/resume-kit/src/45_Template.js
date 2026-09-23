/**
 * 会社規定の用紙（テンプレート）への流し込み。
 *  対応: Google ドキュメント / Google スプレッドシート / Word(.docx) / Excel(.xlsx)（Word・Excel は Google 形式に変換したコピーを作る）
 *  仕組み: 用紙に {{氏名}} などのトークンを置いておき、生成時に値へ置換する。
 *          行リスト（{{学歴職歴_年}} {{学歴職歴_月}} {{学歴職歴_内容}}）は、ドキュメントでは表の行を複製、スプレッドシートでは下方向に展開。
 */

var MIME_ = {
  GDOC: 'application/vnd.google-apps.document',
  GSHEET: 'application/vnd.google-apps.spreadsheet',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  DOC: 'application/msword',
  XLS: 'application/vnd.ms-excel'
};

/** モデル → トークン値（純粋関数） */
function buildTokenValues_(model) {
  var b = model.basic;
  var r = composeRirekisho_(model);
  var s = composeShokumu_(model);
  var single = {
    '氏名': r.name, 'ふりがな': r.kana,
    '生年月日': model.birth ? formatJaDate_(model.birth) : '',
    '生年月日_年': model.birth ? String(model.birth.getFullYear()) : '',
    '生年月日_月': model.birth ? String(model.birth.getMonth() + 1) : '',
    '生年月日_日': model.birth ? String(model.birth.getDate()) : '',
    '年齢': model.age === null ? '' : String(model.age),
    '性別': r.sex, '郵便番号': r.postal, '現住所': r.address, '現住所ふりがな': r.addrKana,
    '電話': r.tel, '携帯': r.mobile, 'メール': r.email, '連絡先': r.contact, '連絡先ふりがな': r.contactKana,
    '作成日': formatJaDate_(model.asOf),
    '作成日_年': String(model.asOf.getFullYear()), '作成日_月': String(model.asOf.getMonth() + 1), '作成日_日': String(model.asOf.getDate()),
    '通勤時間': r.commute, '扶養家族数': r.dependents, '配偶者': r.spouse, '配偶者の扶養義務': r.spouseSupport,
    '志望動機': r.motivation.join('\n'), '本人希望': r.wishes.join('\n'),
    '職務要約': s.summary.join('\n'), '自己PR': s.pr.join('\n'),
    '経験能力': s.skills.map(function (k) { return ['【' + k.title + '】'].concat(k.lines).join('\n'); }).join('\n\n'),
    '職務経歴詳細': s.companies.map(function (c) {
      var L = ['■' + c.header].concat(c.info);
      if (c.projects.length === 0 && c.position) L.push('担当業務：' + c.position);
      c.projects.forEach(function (p) {
        L.push('');
        L.push('◆' + p.name + '（' + p.period + '）');
        if (p.role.length) L.push('役割・規模：' + p.role.join(' / '));
        L = L.concat(p.overview);
      });
      return L.join('\n');
    }).join('\n\n'),
    '実績': s.achievementGroups.map(function (g) { return g.items.map(function (it) { return '・' + it + '（' + g.title + '）'; }).join('\n'); }).join('\n'),
    '資格一覧': s.licenseGroups.map(function (g) { return g.items.map(function (it) { return '・' + it; }).join('\n'); }).join('\n')
  };
  var su = composeSuisen_(model);
  var sv = model.suisen || {};
  single['推薦先企業'] = su.to; single['推薦先部署'] = su.toDept; single['推薦ポジション'] = su.position; single['推薦日'] = su.dateLabel;
  single['推薦者会社'] = nz_(sv['推薦者会社']); single['推薦者部署'] = nz_(sv['推薦者部署・役職']); single['推薦者氏名'] = nz_(sv['推薦者氏名']); single['推薦者連絡先'] = nz_(sv['推薦者連絡先']);
  single['推薦ポイント'] = su.points.map(function (p) { return '・' + p; }).join('\n');
  single['推薦文'] = su.letter.join('\n'); single['人物像'] = su.persona.join('\n'); single['転職理由'] = su.reason.join('\n'); single['懸念点'] = su.concern.join('\n');
  single['現在年収'] = su.salaryNow; single['希望年収'] = su.salaryWish; single['入社可能時期'] = su.joinable; single['希望勤務地'] = su.location; single['他社選考状況'] = su.others;
  single['現職'] = su.current; single['最終学歴'] = su.education;
  var hist = r.historyRows.filter(function (row) { return row.text !== ''; }).map(function (row) { return [row.y, row.m, row.text]; });
  var eduRows = [], jobRows = [], mode = '';
  hist.forEach(function (row) {
    if (row[2] === '学歴') { mode = 'edu'; return; }
    if (row[2] === '職歴') { mode = 'job'; return; }
    if (mode === 'edu') eduRows.push(row); else if (mode === 'job') jobRows.push(row);
  });
  var lists = {
    '学歴職歴': hist,
    '学歴': eduRows,
    '職歴': jobRows,
    '資格': r.licenseRows.filter(function (row) { return row.text !== ''; }).map(function (row) { return [row.y, row.m, row.text]; }),
    '所属企業': s.jobRows
  };
  return { single: single, lists: lists, photoId: r.photoId };
}

function tokenRegex_(name) {
  return '\\{\\{' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}\\}';
}

/** 設定値（URL/ID）→ テンプレートファイル情報 */
function resolveTemplateFile_(spec) {
  var id = extractDriveId_(spec);
  if (!id) throw new Error('テンプレートの URL / ID が不正です: ' + spec);
  var file;
  try { file = DriveApp.getFileById(id); } catch (e) { throw new Error('テンプレートが開けません（ID: ' + id + '）。共有されているか確認してください。'); }
  return { id: id, file: file, mime: file.getMimeType(), name: file.getName() };
}

/** テンプレートを Google 形式のコピーとして出力フォルダに作る。{ id, kind: 'doc'|'sheet', url } */
function copyTemplateAsGoogle_(tpl, name, folder) {
  if (tpl.mime === MIME_.GDOC || tpl.mime === MIME_.GSHEET) {
    var copy = tpl.file.makeCopy(name, folder);
    return { id: copy.getId(), kind: tpl.mime === MIME_.GDOC ? 'doc' : 'sheet', url: copy.getUrl() };
  }
  var target = null;
  if (tpl.mime === MIME_.DOCX || tpl.mime === MIME_.DOC) target = MIME_.GDOC;
  if (tpl.mime === MIME_.XLSX || tpl.mime === MIME_.XLS) target = MIME_.GSHEET;
  if (!target) throw new Error('このテンプレート形式（' + tpl.mime + '）には流し込めません。Word / Excel / Google ドキュメント / スプレッドシートを指定してください。PDF の場合は原本を入手してください。');
  if (typeof Drive === 'undefined') {
    throw new Error('Word / Excel の変換には Drive API（高度なサービス）が必要です。appsscript.json を README の内容に置き換えるか、用紙を Google ドキュメント／スプレッドシートで開いて「Google 形式で保存」し、その ID を設定してください。');
  }
  var created = Drive.Files.create({ name: name, mimeType: target, parents: [folder.getId()] }, tpl.file.getBlob(), { supportsAllDrives: true });
  return { id: created.id, kind: target === MIME_.GDOC ? 'doc' : 'sheet', url: (target === MIME_.GDOC ? 'https://docs.google.com/document/d/' : 'https://docs.google.com/spreadsheets/d/') + created.id + '/edit' };
}

/** テンプレートから生成（履歴書・職務経歴書共通） */
function buildFromTemplate_(model, kind, folder) {
  var tpl = resolveTemplateFile_(model.settings[kind + 'テンプレート']);
  var out = copyTemplateAsGoogle_(tpl, outputFileName_(model, kind), folder);
  var values = buildTokenValues_(model);
  if (out.kind === 'doc') fillDocsTemplate_(out.id, values);
  else fillSheetsTemplate_(out.id, values);
  return finalizeFile_(out.id, out.url, folder, model.settings);
}

// ---------------- Google ドキュメント

function fillDocsTemplate_(docId, values) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var containers = [body];
  if (doc.getHeader()) containers.push(doc.getHeader());
  if (doc.getFooter()) containers.push(doc.getFooter());

  // 行リスト
  Object.keys(KL.TOKENS_LIST).forEach(function (name) {
    var cols = KL.TOKENS_LIST[name].cols;
    var entries = values.lists[name] || [];
    var slots = findListSlotsDoc_(body, name, cols);
    // 表の外に置かれたトークンは、内容をまとめたテキストにする
    var joined = entries.map(function (e) { return e.filter(function (x) { return x !== ''; }).join(' '); }).join('\n');
    if (slots.length === 0) {
      containers.forEach(function (c) {
        cols.forEach(function (col, j) { replaceLiteral_(c, name + '_' + col, j === cols.length - 1 ? joined : ''); });
      });
      return;
    }
    var fill = function (row, entry) {
      cols.forEach(function (col, j) { replaceLiteral_(row, name + '_' + col, entry ? (entry[j] || '') : ''); });
    };
    var last = slots[slots.length - 1];
    var proto = last.copy();
    if (slots.length === 1) {
      // トークン行が 1 行: 行を複製して件数分に増やす
      var table = last.getParent().asTable();
      var idx = table.getChildIndex(last);
      if (entries.length === 0) { fill(last, null); return; }
      entries.forEach(function (entry, i) {
        var target = i === 0 ? last : table.insertTableRow(idx + i, proto.copy());
        fill(target, entry);
      });
      return;
    }
    // トークン行が複数（罫線の行数が決まった用紙）: 上から順に埋め、足りなければ最後の行の下に追加
    slots.forEach(function (row, i) { fill(row, entries[i]); });
    if (entries.length > slots.length) {
      var t2 = last.getParent().asTable();
      var base = t2.getChildIndex(last);
      for (var k = slots.length; k < entries.length; k++) {
        var added = t2.insertTableRow(base + (k - slots.length) + 1, proto.copy());
        fill(added, entries[k]);
      }
    }
  });

  // 写真
  var photo = body.findText(tokenRegex_('写真'));
  if (photo) {
    var para = findAncestor_(photo.getElement(), DocumentApp.ElementType.PARAGRAPH);
    replaceLiteral_(body, '写真', '');
    if (para && values.photoId) {
      try {
        var img = para.asParagraph().appendInlineImage(DriveApp.getFileById(values.photoId).getBlob());
        img.setWidth(85).setHeight(113);
      } catch (e) { /* 画像が読めなければ枠のまま */ }
    }
  }

  // 単一トークン
  Object.keys(values.single).forEach(function (k) {
    containers.forEach(function (c) { replaceLiteral_(c, k, values.single[k]); });
  });
  // 残ったトークンを消す
  containers.forEach(function (c) { c.replaceText('\\{\\{[^}]*\\}\\}', ''); });
  doc.saveAndClose();
}

/**
 * {{name}} を value に「文字どおり」置き換える。
 * replaceText は置換文字列の $ や \ を特殊扱いする可能性があるため、検索して削除→挿入する。
 */
function replaceLiteral_(container, name, value) {
  var pattern = tokenRegex_(name);
  var v = String(value === null || value === undefined ? '' : value).replace(/\{\{|\}\}/g, '');
  var guard = 0;
  var r = container.findText(pattern);
  while (r && guard++ < 1000) {
    var text = r.getElement().asText();
    var start = r.getStartOffset();
    text.deleteText(start, r.getEndOffsetInclusive());
    if (v !== '') text.insertText(start, v);
    r = container.findText(pattern);
  }
}

/** 要素の位置（親からのインデックス列）。文書順の比較と同一判定に使う */
function elPath_(el) {
  var path = [];
  var cur = el;
  while (cur && cur.getParent && cur.getParent()) {
    var parent = cur.getParent();
    path.unshift(parent.getChildIndex(cur));
    cur = parent;
  }
  return path;
}

function comparePath_(a, b) {
  for (var i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** 行リストトークンを含む表の行を文書順に列挙（同じ行は 1 回） */
function findListSlotsDoc_(body, name, cols) {
  var seen = {};
  var slots = [];
  cols.forEach(function (col) {
    var pattern = tokenRegex_(name + '_' + col);
    var r = body.findText(pattern);
    while (r) {
      var row = findAncestor_(r.getElement(), DocumentApp.ElementType.TABLE_ROW);
      if (row) {
        var path = elPath_(row);
        var key = path.join('/');
        if (!seen[key]) { seen[key] = true; slots.push({ row: row.asTableRow(), path: path }); }
      }
      r = body.findText(pattern, r);
    }
  });
  slots.sort(function (a, b) { return comparePath_(a.path, b.path); });
  return slots.map(function (x) { return x.row; });
}

function findAncestor_(el, type) {
  var cur = el;
  while (cur) {
    if (cur.getType && cur.getType() === type) return cur;
    cur = cur.getParent ? cur.getParent() : null;
  }
  return null;
}

// ---------------- Google スプレッドシート

function fillSheetsTemplate_(ssId, values) {
  var ss = SpreadsheetApp.openById(ssId);
  ss.getSheets().forEach(function (sh) {
    Object.keys(KL.TOKENS_LIST).forEach(function (name) {
      var cols = KL.TOKENS_LIST[name].cols;
      var entries = values.lists[name] || [];
      cols.forEach(function (c, j) {
        var cells = sh.createTextFinder('{{' + name + '_' + c + '}}').matchEntireCell(false).findAll();
        if (cells.length === 0) return;
        cells.sort(function (x, y) { return x.getRow() - y.getRow() || x.getColumn() - y.getColumn(); });
        var colValues = entries.map(function (e) { return e[j] || ''; });
        var plan = planSheetListWrites_(cells.map(function (x) { return [x.getRow(), x.getColumn()]; }), colValues);
        plan.forEach(function (w) { sh.getRange(w[0], w[1]).setValue(w[2]); });
      });
    });
    Object.keys(values.single).forEach(function (k) {
      if (k === '写真') return;
      sh.createTextFinder('{{' + k + '}}').matchEntireCell(false).replaceAllWith(values.single[k]);
    });
    sh.createTextFinder('\\{\\{[^}]*\\}\\}').useRegularExpression(true).replaceAllWith('');
  });
  SpreadsheetApp.flush();
}

/**
 * スプレッドシートの行リスト書き込み計画（純粋関数）。
 *  slots: [[row, col], ...]（行順）。1 つなら下方向に展開、複数なら順に埋めて余りは最後の下に続ける。
 *  戻り値: [[row, col, value], ...]
 */
function planSheetListWrites_(slots, values) {
  var out = [];
  if (slots.length === 0) return out;
  if (slots.length === 1) {
    if (values.length === 0) return [[slots[0][0], slots[0][1], '']];
    values.forEach(function (v, i) { out.push([slots[0][0] + i, slots[0][1], v]); });
    return out;
  }
  slots.forEach(function (s, i) { out.push([s[0], s[1], i < values.length ? values[i] : '']); });
  var last = slots[slots.length - 1];
  for (var k = slots.length; k < values.length; k++) out.push([last[0] + (k - slots.length) + 1, last[1], values[k]]);
  return out;
}

// ---------------- 診断とトークン自動挿入

/** テンプレート内のトークンを列挙して分類する（純粋関数: text → 結果） */
function classifyTokens_(text) {
  var found = {};
  var m, re = /\{\{([^}]+)\}\}/g;
  while ((m = re.exec(text)) !== null) found[m[1].trim()] = true;
  var singles = KL.TOKENS_SINGLE.map(function (t) { return t[0]; });
  var known = [], unknown = [];
  Object.keys(found).forEach(function (t) {
    var isList = Object.keys(KL.TOKENS_LIST).some(function (n) {
      return KL.TOKENS_LIST[n].cols.some(function (c) { return t === n + '_' + c; });
    });
    if (singles.indexOf(t) >= 0 || isList) known.push(t); else unknown.push(t);
  });
  var isSuisen = !!(found['推薦文'] || found['推薦ポイント'] || found['推薦ポジション']);
  var essential = isSuisen ? ['氏名', '推薦文'] : ['氏名', '生年月日', '現住所'];
  var missing = essential.filter(function (e) { return !found[e] && !found[e + '_年']; });
  if (!isSuisen && !Object.keys(found).some(function (t) { return /^(学歴職歴|学歴|職歴)_/.test(t); }) && !found['職務経歴詳細']) missing.push('学歴職歴_内容（または 学歴_内容 / 職歴_内容 / 職務経歴詳細）');
  return { known: known.sort(), unknown: unknown.sort(), missing: missing };
}

function templateText_(tpl) {
  if (tpl.mime === MIME_.GDOC) return DocumentApp.openById(tpl.id).getBody().getText();
  if (tpl.mime === MIME_.GSHEET) {
    return SpreadsheetApp.openById(tpl.id).getSheets().map(function (sh) {
      return sh.getDataRange().getValues().map(function (r) { return r.join('\t'); }).join('\n');
    }).join('\n');
  }
  throw new Error('診断は Google ドキュメント / スプレッドシートのみ対応です。Word / Excel は一度 Google 形式で保存してください（生成時は自動変換されます）。');
}

/** ラベル文字列 → トークン（該当なしは ''） */
function labelToToken_(label) {
  var s = nz_(label).replace(/[\s　※:：・()（）]/g, '');
  if (!s || s.length > 40) return '';
  if (/書$/.test(s) || /現在$/.test(s)) return ''; // 「職務経歴書」などのタイトル、「年 月 日現在」
  for (var i = 0; i < KL.LABEL_TO_TOKEN.length; i++) {
    var key = KL.LABEL_TO_TOKEN[i][0].replace(/[\s　・]/g, '');
    if (s.indexOf(key) === 0) return KL.LABEL_TO_TOKEN[i][1];
  }
  return '';
}

/**
 * 文脈込みでトークンを決める（純粋関数）。
 *  below: 直下のラベル。「ふりがな」の直下が現住所／連絡先なら、それぞれのふりがなにする
 *  used : すでに入れた単一値トークン。連絡先欄の 2 つ目の「電話」などは入れない
 */
function resolveLabelToken_(label, below, used) {
  var t = labelToToken_(label);
  if (!t) return '';
  if (t === '{{ふりがな}}') {
    var b = labelToToken_(below);
    if (b === '{{現住所}}') t = '{{現住所ふりがな}}';
    else if (b === '{{連絡先}}') t = '{{連絡先ふりがな}}';
  }
  if (!listNameOfToken_(t) && used[t]) return '';
  used[t] = true;
  return t;
}

/** 右隣が埋まっているとき、直下や同じセルに入れてよい「文章欄」のトークン */
function isBlockToken_(t) {
  return ['{{志望動機}}', '{{本人希望}}', '{{職務要約}}', '{{自己PR}}', '{{経験能力}}', '{{職務経歴詳細}}', '{{推薦ポイント}}', '{{推薦文}}', '{{人物像}}', '{{転職理由}}', '{{懸念点}}'].indexOf(t) >= 0;
}

/** リスト系トークン {{学歴職歴_内容}} → 名前 */
function listNameOfToken_(token) {
  var m = token.match(/^\{\{(.+)_内容\}\}$/);
  return m ? m[1] : '';
}

/** ドキュメントを走査し、ラベルの右隣（リストは次の行、文章欄は直下）にトークンを書く。挿入数を返す */
function autoInsertTokensDoc_(docId) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var count = 0;
  var used = {};
  body.getTables().forEach(function (table) {
    var nRows = table.getNumRows();
    for (var r = 0; r < nRows; r++) {
      var row = table.getRow(r);
      var nCells = row.getNumCells();
      for (var c = 0; c < nCells; c++) {
        var cell = row.getCell(c);
        var below = (r + 1 < nRows && c < table.getRow(r + 1).getNumCells()) ? table.getRow(r + 1).getCell(c).getText() : '';
        var token = resolveLabelToken_(cell.getText(), below, used);
        if (!token) continue;
        var listName = listNameOfToken_(token);
        if (listName) {
          if (r + 1 >= nRows) continue;
          var next = table.getRow(r + 1);
          if (nz_(next.getText()) !== '') continue;
          var cols = KL.TOKENS_LIST[listName].cols;
          var n = next.getNumCells();
          // 右端を内容、その左 2 つを年・月とみなす
          var map = n >= 3 ? [[n - 3, 0], [n - 2, 1], [n - 1, 2]] : [[n - 1, 2]];
          map.forEach(function (pair) { next.getCell(pair[0]).setText('{{' + listName + '_' + cols[pair[1]] + '}}'); count++; });
          r++; // 次の行は処理済み
        } else if (c + 1 < nCells && nz_(row.getCell(c + 1).getText()) === '') {
          row.getCell(c + 1).setText(token); count++;
        } else if (isBlockToken_(token)) {
          if (r + 1 < nRows && c < table.getRow(r + 1).getNumCells() && nz_(below) === '') {
            table.getRow(r + 1).getCell(c).setText(token);
          } else {
            cell.appendParagraph(token);
          }
          count++;
        }
      }
    }
  });
  // 表の外の見出し段落（職務経歴書に多い「■職務要約」「氏名：」など）
  var n = body.getNumChildren();
  for (var i = 0; i < n; i++) {
    var el = body.getChild(i);
    if (el.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var p = el.asParagraph();
    var text = nz_(p.getText());
    var inline = text.match(/^(氏\s*名|作成日|作成)\s*[:：]\s*$/);
    if (inline) {
      var tk = /氏/.test(inline[1]) ? '{{氏名}}' : '{{作成日}}';
      if (!used[tk]) { p.appendText(tk); used[tk] = true; count++; }
      continue;
    }
    var token2 = resolveLabelToken_(text.replace(/^[■□●◆【\[]+|[】\]]+$/g, ''), '', used);
    if (!isBlockToken_(token2)) continue;
    var nextEl = i + 1 < n ? body.getChild(i + 1) : null;
    if (nextEl && nextEl.getType() === DocumentApp.ElementType.PARAGRAPH && nz_(nextEl.asParagraph().getText()) === '') {
      nextEl.asParagraph().setText(token2);
    } else {
      body.insertParagraph(i + 1, token2);
      n++; i++;
    }
    count++;
  }
  doc.saveAndClose();
  return count;
}

/** スプレッドシート版。ラベルの右隣の空セル、リストは次の行 */
function autoInsertTokensSheet_(ssId) {
  var ss = SpreadsheetApp.openById(ssId);
  var count = 0;
  var used = {};
  ss.getSheets().forEach(function (sh) {
    var vals = sh.getDataRange().getValues();
    for (var r = 0; r < vals.length; r++) {
      for (var c = 0; c < vals[r].length; c++) {
        var token = resolveLabelToken_(vals[r][c], r + 1 < vals.length ? vals[r + 1][c] : '', used);
        if (!token) continue;
        var listName = listNameOfToken_(token);
        if (listName) {
          if (r + 1 >= vals.length) continue;
          var cols = KL.TOKENS_LIST[listName].cols;
          // 同じ行の「年」「月」列を探す。無ければラベルの 2 つ左・1 つ左
          var yCol = -1, mCol = -1;
          for (var k = 0; k < vals[r].length; k++) {
            var h = nz_(vals[r][k]).replace(/\s/g, '');
            if (h === '年' && yCol < 0) yCol = k;
            if (h === '月' && mCol < 0) mCol = k;
          }
          if (yCol < 0) yCol = c - 2;
          if (mCol < 0) mCol = c - 1;
          if (nz_(vals[r + 1][c]) !== '') continue;
          if (yCol >= 0) { sh.getRange(r + 2, yCol + 1).setValue('{{' + listName + '_' + cols[0] + '}}'); count++; }
          if (mCol >= 0) { sh.getRange(r + 2, mCol + 1).setValue('{{' + listName + '_' + cols[1] + '}}'); count++; }
          sh.getRange(r + 2, c + 1).setValue('{{' + listName + '_' + cols[2] + '}}'); count++;
        } else if (c + 1 < vals[r].length && nz_(vals[r][c + 1]) === '') {
          sh.getRange(r + 1, c + 2).setValue(token); vals[r][c + 1] = token; count++;
        } else if (isBlockToken_(token) && r + 1 < vals.length && nz_(vals[r + 1][c]) === '') {
          sh.getRange(r + 2, c + 1).setValue(token); vals[r + 1][c] = token; count++;
        }
      }
    }
  });
  SpreadsheetApp.flush();
  return count;
}
