/**
 * 添付資料 → AI で読み取り → 入力シートへ反映。
 *  AI には各シートの見出しをそのままキーにした JSON を返させ、汎用的に書き込む。
 *  既定は「空欄だけ埋める」。表シートにデータがある場合は触らない（重複を作らない）。
 */

/** 取り込み用の指示文（純粋関数） */
function buildImportPrompt_(model) {
  var L = [];
  L.push('添付の資料（既存の履歴書・職務経歴書・面談メモ・スキルシート等）から、候補者の情報を読み取り、下の JSON 形式で返してください。');
  L.push('');
  L.push('# ルール');
  L.push('- 資料に書かれていないことは創作しない。分からない値は "" にし、「要確認」に理由を書く');
  L.push('- 年は西暦4桁、月は数字（和暦は西暦に換算）。生年月日・作成日は YYYY-MM-DD');
  L.push('- 雇用形態は資料に明記があるときだけ入れる（無ければ "" にして要確認へ）。退社年月が無い会社は在職中として退社年・退社月を ""');
  L.push('- 会社名は正式名称（株式会社を省略しない）。プロジェクトの「会社名」は職歴の会社名と完全一致させる');
  L.push('- 支援内容は 1 行 1 項目（改行 \\n 区切り、先頭の「・」は付けない）');
  L.push('- 経験・能力は 2〜3 件。資料から読める範囲で ミッション / 目標数字 / 課題 / 工夫点 / 結果 を埋める。読めなければ 本文 に要約');
  L.push('- 職務要約（200〜400字）・自己PR（300〜600字）は資料の事実だけで下書きする');
  L.push('- 資料間で矛盾がある場合は新しい資料を優先し、要確認に両方の値を書く');
  L.push('- 推薦書の項目は、面談メモ等に書かれている場合だけ入れる');
  L.push('');
  L.push('# JSON 形式（キーは変えない。配列は資料にある件数だけ）');
  var schema = {};
  schema[KL.SHEET.BASIC] = keysObject_(KL.BASIC_KEYS.filter(function (k) { return k[0] !== '写真ファイルID' && k[0] !== '作成日'; }));
  [KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS, KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS].forEach(function (name) {
    var o = {};
    KL.HEADERS[name].forEach(function (h) { o[h] = ''; });
    schema[name] = [o];
  });
  schema[KL.SHEET.TEXTS] = keysObject_(KL.TEXT_KEYS);
  schema[KL.SHEET.SUISEN] = keysObject_(KL.SUISEN_KEYS.filter(function (k) {
    return ['人物像・面談所感', '転職理由', '現在年収', '希望年収', '入社可能時期', '希望勤務地', '他社選考状況'].indexOf(k[0]) >= 0;
  }));
  schema['要確認'] = ['確認が必要な点（1件1文）'];
  L.push(JSON.stringify(schema, null, 1));
  L.push('');
  L.push('# 区分・選択肢');
  L.push('学歴の区分: ' + KL.VALIDATION[KL.SHEET.EDUCATION].values.join(' / '));
  L.push('雇用形態: ' + KL.VALIDATION[KL.SHEET.JOBS].values.join(' / '));
  L.push('免許・資格の区分: ' + KL.VALIDATION[KL.SHEET.LICENSES].values.join(' / ') + '。「履歴書に載せる」は 免許・資格 なら "○"');
  L.push('実績の区分: ' + KL.VALIDATION[KL.SHEET.ACHIEVEMENTS].values.join(' / '));
  var name = nz_(model.basic['氏名']);
  if (name) {
    L.push('');
    L.push('# 補足');
    L.push('この候補者の氏名は「' + name + '」です（資料の氏名と違う場合は要確認に書く）。');
  }
  return L.join('\n');
}

function keysObject_(keys) {
  var o = {};
  keys.forEach(function (k) { o[k[0]] = ''; });
  return o;
}

/** AI の返答から JSON オブジェクトを取り出す（コードフェンス・前置きに耐える）。失敗したら null */
function parseJsonObject_(text) {
  var s = nz_(text);
  var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1];
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

/** セル値に整形（配列は改行区切り） */
function cellValue_(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(cellValue_).filter(function (x) { return x !== ''; }).join('\n');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).trim();
}

/**
 * 読み取り結果をシートへ書く。mode: 'fill'（空欄だけ）| 'overwrite'（置き換え）
 * 戻り値: { written: 書いたセル数, rows: {シート: 行数}, skipped: [理由] }
 */
function applyImport_(ss, data, mode) {
  var res = { written: 0, rows: {}, skipped: [] };
  // 項目 / 値 形式
  [[KL.SHEET.BASIC, KL.BASIC_KEYS], [KL.SHEET.TEXTS, KL.TEXT_KEYS], [KL.SHEET.SUISEN, KL.SUISEN_KEYS]].forEach(function (pair) {
    var src = data[pair[0]];
    if (!src || typeof src !== 'object') return;
    var sh = ss.getSheetByName(pair[0]);
    if (!sh) return;
    var allowed = pair[1].map(function (k) { return k[0]; });
    var defaults = {};
    pair[1].forEach(function (k) { defaults[k[0]] = k[1]; });
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var key = nz_(rows[i][0]);
      if (allowed.indexOf(key) < 0 || !(key in src)) continue;
      var v = cellValue_(src[key]);
      if (!v) continue;
      var cur = nz_(rows[i][1]);
      if (mode === 'fill' && cur !== '' && cur !== nz_(defaults[key])) continue;
      sh.getRange(i + 1, 2).setValue(v);
      res.written++;
    }
  });
  // 表形式
  [KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS, KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS].forEach(function (name) {
    var list = data[name];
    if (!Array.isArray(list)) return;
    var headers = KL.HEADERS[name];
    var values = list.filter(function (o) { return o && typeof o === 'object'; })
      .map(function (o) { return headers.map(function (h) { return cellValue_(o[h]); }); })
      .filter(function (r) { return r.some(function (x) { return x !== ''; }); });
    if (values.length === 0) return;
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var last = sh.getLastRow();
    if (last >= 2) {
      if (mode === 'fill') { res.skipped.push(name + '（入力済みのため変更なし）'); return; }
      sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), headers.length)).clearContent();
    }
    sh.getRange(2, 1, values.length, headers.length).setValues(values);
    res.rows[name] = values.length;
    res.written += values.length * headers.length;
  });
  return res;
}

/** 取り込み結果シート */
function writeImportSheet_(ss, sources, errors, data, res) {
  var sh = ss.getSheetByName(KL.SHEET.IMPORT) || ss.insertSheet(KL.SHEET.IMPORT);
  sh.clear();
  var rows = [['区分', '内容']];
  sources.forEach(function (s) { rows.push(['読み取った資料', s]); });
  errors.forEach(function (e) { rows.push(['読み取りエラー', e]); });
  Object.keys(res.rows).forEach(function (k) { rows.push(['反映した行', k + ': ' + res.rows[k] + ' 行']); });
  res.skipped.forEach(function (s) { rows.push(['反映しなかった', s]); });
  (Array.isArray(data['要確認']) ? data['要確認'] : []).forEach(function (s) { rows.push(['要確認', cellValue_(s)]); });
  rows.push(['AI の返答（原文）', JSON.stringify(data, null, 1).slice(0, 45000)]);
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#e8eaed');
  sh.setColumnWidth(1, 140).setColumnWidth(2, 700);
  sh.getRange(1, 2, rows.length, 1).setWrap(true);
  sh.setFrozenRows(1);
  return sh;
}
