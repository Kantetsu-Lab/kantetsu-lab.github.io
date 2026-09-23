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
  // ラベル型・会社枠型の用紙で使う項目
  single['住まい'] = residenceArea_(r.address);
  single['推薦コメント'] = (su.points.length ? su.points.map(function (p) { return '・' + p; }).join('\n') + (su.letter.length ? '\n\n' : '') : '') + su.letter.join('\n');
  var licGroups = s.licenseGroups.filter(function (g) { return g.title !== 'ツール・技術'; });
  var toolGroups = s.licenseGroups.filter(function (g) { return g.title === 'ツール・技術'; });
  single['資格一覧'] = licGroups.map(function (g) { return g.items.map(function (it) { return '・' + it; }).join('\n'); }).join('\n');
  single['スキル経験'] = [single['経験能力']].concat(toolGroups.map(function (g) {
    return '＜' + g.title + '＞\n' + g.items.map(function (it) { return '・' + it; }).join('\n');
  })).filter(function (x) { return x; }).join('\n\n');
  var companies = s.companies.map(function (c) { return companyTokenMap_(c); });
  var hist = r.historyRows.filter(function (row) { return row.text !== ''; }).map(function (row) { return [row.y, row.m, row.text, row.name, row.kind]; });
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
    '資格': r.licenseRows.filter(function (row) { return row.text !== ''; }).map(function (row) { return [row.y, row.m, row.text, row.name, row.kind]; }),
    '所属企業': s.jobRows
  };
  return { single: single, lists: lists, photoId: r.photoId, companies: companies };
}

/** 現住所 → 「都道府県＋市区町村」（推薦書の「住まい」用。番地以降は出さない） */
function residenceArea_(address) {
  var a = nz_(address);
  var m = a.match(/^(.{2,3}?[都道府県])(.+?[市区町村郡])/);
  if (m) return m[1] + m[2];
  m = a.match(/^(.+?[市区町村])/);
  return m ? m[1] : a;
}

/** 職務経歴書の 1 社分 → {{会社_...}} の値（純粋関数） */
function companyTokenMap_(c) {
  var tasks = [], results = [];
  if (c.projects.length === 0 && c.position) tasks.push('・' + c.position);
  else if (c.position) tasks.push('所属：' + c.position);
  c.projects.forEach(function (p) {
    var multi = c.projects.length > 1;
    if (multi) tasks.push('◆' + p.name + '（' + p.period + '）');
    p.tasksRaw.forEach(function (t) { tasks.push('・' + t); });
    p.resultsRaw.forEach(function (x) { results.push('・' + (multi ? '【' + p.name + '】' : '') + x); });
  });
  var detail = c.projects.map(function (p) {
    return ['◆' + p.name + '（' + p.period + '）'].concat(p.role.length ? ['役割・規模：' + p.role.join(' / ')] : []).concat(p.overview).join('\n');
  }).join('\n\n');
  return {
    '会社_見出し': c.period + '　' + c.company + (c.employment ? '（' + c.employment + '）' : ''),
    '会社_期間': c.period, '会社_会社名': c.company, '会社_雇用形態': c.employment, '会社_部門': c.position,
    '会社_事業内容': c.business, '会社_資本金': c.capital, '会社_売上高': c.sales, '会社_従業員数': c.employees, '会社_上場': c.listing,
    '会社_担当業務': tasks.join('\n'), '会社_実績': results.join('\n'), '会社_詳細': detail
  };
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

/** 文字列内のトークンを置き換え（純粋関数。スプレッドシート用） */
function fillTokensInString_(text, map) {
  return String(text).replace(/\{\{([^{}]+)\}\}/g, function (m, inner) { return tokenValue_(inner, map, true); });
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
function buildFromTemplate_(model, kind, folder, chosen) {
  var tpl = resolveTemplateFile_(chosen ? chosen.spec : model.settings[kind + 'テンプレート']);
  var out = copyTemplateAsGoogle_(tpl, outputFileName_(model, kind), folder);
  var values = buildTokenValues_(model);
  var warnings = [];
  if (out.kind === 'doc') fillDocsTemplate_(out.id, values);
  else {
    if (chosen && chosen.sheetName) keepOnlySheet_(out.id, chosen.sheetName);
    warnings = fillSheetsTemplate_(out.id, values) || [];
  }
  var res = finalizeFile_(out.id, out.url, folder, model.settings);
  res.warnings = warnings;
  return res;
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

  // 会社ブロック（{{会社_...}} を含む表を会社の数だけ複製）
  fillCompanyBlocksDoc_(body, values.companies || []);
  // 単一トークン → 残りは既定値か空に
  containers.forEach(function (c) { fillTokensIn_(c, values.single, false); });
  containers.forEach(function (c) { fillTokensIn_(c, {}, true); });
  doc.saveAndClose();
}

/** {{会社_...}} を含む表を会社ごとに複製して埋める（職務経歴書の会社枠） */
function fillCompanyBlocksDoc_(body, companies) {
  body.getTables().filter(function (t) { return t.getText().indexOf('{{会社_') >= 0; }).forEach(function (table) {
    if (companies.length === 0) { fillTokensIn_(table, {}, true); return; }
    var parent = table.getParent();
    var proto = table.copy();
    var last = table;
    companies.forEach(function (c, i) {
      var target = table;
      if (i > 0) {
        var idx = parent.getChildIndex(last);
        parent.insertParagraph(idx + 1, '');
        target = parent.insertTable(idx + 2, proto.copy());
      }
      fillTokensIn_(target, c, true);
      last = target;
    });
  });
}

/** トークン文字列 "名前" / "名前|既定値" を分解（純粋関数） */
function parseToken_(inner) {
  var i = inner.indexOf('|');
  return i < 0 ? { name: inner.trim(), def: null } : { name: inner.slice(0, i).trim(), def: inner.slice(i + 1) };
}

/** 1 トークンの置換後の文字列。map に無い名前は undefined（dropUnknown なら既定値か空） */
function tokenValue_(inner, map, dropUnknown) {
  var t = parseToken_(inner);
  var has = Object.prototype.hasOwnProperty.call(map, t.name);
  if (!has && !dropUnknown) return undefined;
  var v = has ? String(map[t.name] === null || map[t.name] === undefined ? '' : map[t.name]) : '';
  if (v === '' && t.def !== null) v = t.def;
  return v.replace(/\{\{|\}\}/g, '');
}

/**
 * コンテナ内の {{名前}} / {{名前|既定値}} を map の値で「文字どおり」置き換える。
 * replaceText は置換文字列の $ や \ を特殊扱いする可能性があるため、検索して削除→挿入する。
 * 一致を先に全部集め、後ろから処理する（前の位置がずれないように）。
 */
function fillTokensIn_(container, map, dropUnknown) {
  replaceMatchesWith_(container, '\\{\\{[^{}]+\\}\\}', function (m) {
    return tokenValue_(m.slice(2, -2), map, dropUnknown);
  });
}

/** 正規表現に一致した各箇所を fn(一致文字列) の戻り値で置き換える（undefined は変更なし） */
function replaceMatchesWith_(container, pattern, fn) {
  var hits = [];
  var r = container.findText(pattern);
  var guard = 0;
  while (r && guard++ < 5000) {
    hits.push({ text: r.getElement().asText(), start: r.getStartOffset(), end: r.getEndOffsetInclusive() });
    r = container.findText(pattern, r);
  }
  for (var i = hits.length - 1; i >= 0; i--) {
    var h = hits[i];
    var matched = h.text.getText().slice(h.start, h.end + 1);
    var v = fn(matched);
    if (v === undefined || v === matched) continue;
    h.text.deleteText(h.start, h.end);
    if (v !== '') h.text.insertText(h.start, v);
  }
  return hits.length;
}

/** {{name}}（既定値付きも含む）を value に置き換える */
function replaceLiteral_(container, name, value) {
  var map = {};
  map[name] = value;
  fillTokensIn_(container, map, false);
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

/** コピーしたスプレッドシートから、選んだシート以外を消す */
function keepOnlySheet_(ssId, sheetName) {
  var ss = SpreadsheetApp.openById(ssId);
  var keep = ss.getSheetByName(sheetName);
  if (!keep) throw new Error('テンプレートにシート「' + sheetName + '」がありません。');
  ss.getSheets().forEach(function (sh) { if (sh.getName() !== sheetName) ss.deleteSheet(sh); });
}

/**
 * {{会社_...}} を含む行のまとまり（会社枠）を会社の数だけ下に複製して埋める。
 * 複製は行を挿入してから書式ごとコピーするので、下の内容は押し下げられる。
 */
function fillCompanyBlocksSheet_(sh, companies) {
  var hits = sh.createTextFinder('{{会社_').matchEntireCell(false).findAll();
  if (hits.length === 0) return;
  var top = Math.min.apply(null, hits.map(function (c) { return c.getRow(); }));
  var bottom = Math.max.apply(null, hits.map(function (c) { return c.getRow(); }));
  var h = bottom - top + 1;
  var width = Math.max(sh.getLastColumn(), 1);
  var list = companies.length ? companies : [{}];
  if (list.length > 1) {
    sh.insertRowsAfter(bottom, h * (list.length - 1));
    for (var i = 1; i < list.length; i++) {
      sh.getRange(top, 1, h, width).copyTo(sh.getRange(top + h * i, 1, h, width));
    }
  }
  list.forEach(function (c, i) {
    var range = sh.getRange(top + h * i, 1, h, width);
    var vals = range.getValues();
    var changed = false;
    vals.forEach(function (row, r) {
      row.forEach(function (v, k) {
        if (typeof v === 'string' && v.indexOf('{{会社_') >= 0) {
          var map = {};
          Object.keys(c).forEach(function (key) { map[key] = c[key]; });
          sh.getRange(top + h * i + r, k + 1).setValue(String(v).replace(/\{\{(会社_[^{}]+)\}\}/g, function (m, inner) { return tokenValue_(inner, map, true); }));
          changed = true;
        }
      });
    });
    return changed;
  });
}

function fillSheetsTemplate_(ssId, values) {
  var ss = SpreadsheetApp.openById(ssId);
  var warnings = {};
  ss.getSheets().forEach(function (sh) {
    Object.keys(KL.TOKENS_LIST).forEach(function (name) {
      var cols = KL.TOKENS_LIST[name].cols;
      var entries = values.lists[name] || [];
      cols.forEach(function (c, j) {
        var cells = sh.createTextFinder('{{' + name + '_' + c + '}}').matchEntireCell(false).findAll();
        if (cells.length === 0) return;
        // 左の表 → 右の表（見開きの用紙で続きが右にある場合）の順に、各表の中は上から
        cells.sort(function (x, y) { return x.getColumn() - y.getColumn() || x.getRow() - y.getRow(); });
        var colValues = entries.map(function (e) { return e[j] || ''; });
        var plan = planSheetListWrites_(cells.map(function (x) { return [x.getRow(), x.getColumn()]; }), colValues);
        plan.forEach(function (w) { sh.getRange(w[0], w[1]).setValue(w[2]); });
        if (plan.overflow) warnings[name] = Math.max(warnings[name] || 0, plan.overflow);
      });
    });
    // 会社枠 → 単一トークン（既定値付きも）をセルごとに置き換え
    fillCompanyBlocksSheet_(sh, values.companies || []);
    var map = {};
    Object.keys(values.single).forEach(function (k) { if (k !== '写真') map[k] = values.single[k]; });
    sh.createTextFinder('{{').matchEntireCell(false).findAll().forEach(function (cell) {
      var v = cell.getValue();
      if (typeof v !== 'string') return;
      cell.setValue(fillTokensInString_(v, map));
    });
  });
  SpreadsheetApp.flush();
  return Object.keys(warnings).map(function (k) { return k + ' の欄が ' + warnings[k] + ' 行足りません（書ききれなかった分は出力していません）'; });
}

/**
 * スプレッドシートの行リスト書き込み計画（純粋関数）。
 *  slots: [[row, col], ...]（行順）。1 つなら下方向に展開、複数なら順に埋めて余りは最後の下に続ける。
 *  戻り値: [[row, col, value], ...]
 */
function planSheetListWrites_(slots, values) {
  var out = [];
  out.overflow = 0;
  if (slots.length === 0) return out;
  if (slots.length === 1) {
    if (values.length === 0) return [[slots[0][0], slots[0][1], '']];
    values.forEach(function (v, i) { out.push([slots[0][0] + i, slots[0][1], v]); });
    return out;
  }
  // 固定欄（罫線の行数が決まった用紙）: 欄の外には書かない。足りない件数は overflow で返す
  slots.forEach(function (s, i) { out.push([s[0], s[1], i < values.length ? values[i] : '']); });
  out.overflow = Math.max(values.length - slots.length, 0);
  return out;
}

// ---------------- 診断とトークン自動挿入

/** テンプレート内のトークンを列挙して分類する（純粋関数: text → 結果） */
function classifyTokens_(text) {
  var found = {};
  var m, re = /\{\{([^}]+)\}\}/g;
  while ((m = re.exec(text)) !== null) found[parseToken_(m[1]).name] = true;
  var singles = KL.TOKENS_SINGLE.map(function (t) { return t[0]; }).concat(KL.TOKENS_COMPANY.map(function (t) { return t[0]; }));
  var known = [], unknown = [];
  Object.keys(found).forEach(function (t) {
    var isList = Object.keys(KL.TOKENS_LIST).some(function (n) {
      return KL.TOKENS_LIST[n].cols.some(function (c) { return t === n + '_' + c; });
    });
    if (singles.indexOf(t) >= 0 || isList) known.push(t); else unknown.push(t);
  });
  var isSuisen = !!(found['推薦文'] || found['推薦ポイント'] || found['推薦ポジション'] || found['推薦コメント']);
  var isShokumu = Object.keys(found).some(function (t) { return /^会社_/.test(t); }) || !!(found['職務要約'] || found['職務経歴詳細']);
  var essential = isSuisen ? ['氏名'] : isShokumu ? ['氏名', '職務要約'] : ['氏名', '生年月日', '現住所'];
  if (isSuisen && !found['推薦文'] && !found['推薦コメント']) essential.push('推薦文');
  var missing = essential.filter(function (e) { return !found[e] && !found[e + '_年']; });
  var hasCareer = Object.keys(found).some(function (t) { return /^(学歴職歴|学歴|職歴|会社)_/.test(t); }) || found['職務経歴詳細'];
  if (!isSuisen && !hasCareer) missing.push('学歴職歴_内容（または 学歴_内容 / 職歴_内容 / 職務経歴詳細）');
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
  if (KL.TOKENS_ONCE.indexOf(t) >= 0 && used[t]) return '';
  if (used[t] === 'block') return ''; // 会社枠がある文書の「職務経歴」見出しなど
  if (!used[t]) used[t] = true;
  return t;
}

/** 右隣が埋まっているとき、直下や同じセルに入れてよい「文章欄」のトークン */
function isBlockToken_(t) {
  return ['{{志望動機}}', '{{本人希望}}', '{{職務要約}}', '{{自己PR}}', '{{経験能力}}', '{{職務経歴詳細}}', '{{推薦ポイント}}', '{{推薦コメント}}', '{{スキル経験}}', '{{資格一覧}}', '{{推薦文}}', '{{人物像}}', '{{転職理由}}', '{{懸念点}}'].indexOf(t) >= 0;
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
  // 「20xx年xx月xx日」「○○ ○○」のような穴埋め表記（本文・ヘッダー・フッター）
  [body, doc.getHeader(), doc.getFooter()].forEach(function (sec) { if (sec) count += replacePlaceholders_(sec); });
  // 職務経歴の会社枠
  body.getTables().forEach(function (table) {
    if (isCompanyTable_(table.getText())) { count += tokenizeCompanyTable_(table); used['{{職務経歴詳細}}'] = 'block'; }
  });
  body.getTables().forEach(function (table) {
    if (table.getText().indexOf('{{会社_') >= 0) return;
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
  // 表の外の段落（本文とヘッダー）: 「■職務要約」のような見出し、「氏名：」のようなラベル
  var sections = [body];
  if (doc.getHeader()) sections.unshift(doc.getHeader());
  sections.forEach(function (sec) { count += insertParagraphTokens_(sec, used); });
  doc.saveAndClose();
  return count;
}

/** 穴埋め表記 → トークン。置き換えた数を返す */
function replacePlaceholders_(sec) {
  var n = 0;
  n += replaceMatchesWith_(sec, KL.PLACEHOLDER_DATE, function () { return '{{作成日}}'; });
  n += replaceMatchesWith_(sec, KL.PLACEHOLDER_NAME, function () { return '{{氏名}}'; });
  return n;
}

/** 会社枠らしい表か（純粋関数） */
function isCompanyTable_(text) {
  return /事業内容/.test(text) && /(担当業務|業務内容|実績)/.test(text);
}

/** 行テキストの「ラベル：既定値」をトークン化（純粋関数）。例: 資本金：不明 → 資本金：{{会社_資本金|不明}} */
function tokenizeCompanyLine_(line) {
  return line.replace(/(事業内容|資本金|売上高|従業員数|上場|設立|雇用形態)([：:])\s*([^　\s]*)/g, function (m, label, colon, def) {
    if (/\{\{/.test(def)) return m;
    var name = label === '設立' ? '' : label;
    if (!name) return m;
    return label + colon + '{{会社_' + name + (def ? '|' + def : '') + '}}';
  });
}

/** 会社枠の表にトークンを入れる。入れた数を返す */
function tokenizeCompanyTable_(table) {
  var n = 0;
  // 先頭行が空（網掛けの見出し行）なら会社見出し
  var first = table.getRow(0);
  if (nz_(first.getText()) === '') { first.getCell(0).setText('{{会社_見出し}}'); n++; }
  var paras = [];
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      for (var k = 0; k < cell.getNumChildren(); k++) {
        var el = cell.getChild(k);
        if (el.getType() === DocumentApp.ElementType.PARAGRAPH) paras.push(el.asParagraph());
      }
    }
  }
  paras.forEach(function (p, i) {
    var t = p.getText();
    var t2 = tokenizeCompanyLine_(t);
    if (t2 !== t) { p.setText(t2); n++; return; }
    var head = t.replace(/\s/g, '');
    var key = /^【(担当業務|業務内容)】$/.test(head) ? '会社_担当業務' : /^【実績/.test(head) ? '会社_実績' : '';
    if (!key || i + 1 >= paras.length) return;
    var next = paras[i + 1];
    if (/^[・\s　]*$/.test(next.getText())) { next.setText('{{' + key + '}}'); n++; }
  });
  return n;
}

/** 段落のラベルにトークンを入れる（見出し → 次の空段落、「ラベル：」→ 右に追記）。入れた数を返す */
function insertParagraphTokens_(sec, used) {
  var count = 0;
  var n = sec.getNumChildren();
  for (var i = 0; i < n; i++) {
    var el = sec.getChild(i);
    if (el.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var p = el.asParagraph();
    var text = nz_(p.getText());
    if (!text || text.indexOf('{{') >= 0) continue;
    var plan = paragraphTokenPlan_(text, used);
    if (!plan) continue;
    if (plan.mode === 'inline') { p.appendText(plan.append); count++; continue; }
    var nextEl = i + 1 < n ? sec.getChild(i + 1) : null;
    if (nextEl && nextEl.getType() === DocumentApp.ElementType.PARAGRAPH && nz_(nextEl.asParagraph().getText()) === '') {
      nextEl.asParagraph().setText(plan.token);
    } else if (plan.colon) {
      p.appendText(plan.token);
    } else {
      sec.insertParagraph(i + 1, plan.token);
      n++; i++;
    }
    count++;
  }
  return count;
}

/**
 * 段落テキスト → どこにどのトークンを入れるか（純粋関数）。null なら何もしない。
 *  「■職務要約」→ { mode:'block' }、「氏名：」→ { mode:'inline', append:'{{氏名}}' }、「性別」→ { mode:'inline', append:'：{{性別}}' }
 */
function paragraphTokenPlan_(text, used) {
  var t = text.trim();
  var colon = /[:：]\s*$/.test(t);
  var label = t.replace(/^[■□●◆【\[]+|[】\]]+$/g, '').replace(/[:：]\s*$/, '');
  var heading = /^[■□●◆【\[]/.test(t);
  if (!colon && !heading && !/^[^\s　:：]{1,8}$/.test(t)) return null;
  var token = resolveLabelToken_(label, '', used);
  token = KL.PARAGRAPH_ALIASES[token] || token;
  if (!token || listNameOfToken_(token)) return null;
  if (isBlockToken_(token)) return { mode: 'block', token: token, colon: colon };
  if (heading) return null;
  var suffix = token === '{{年齢}}' ? '歳' : '';
  return { mode: 'inline', token: token, append: (colon ? '' : '：') + token + suffix };
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
