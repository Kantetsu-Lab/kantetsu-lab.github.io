/**
 * 純粋関数のユーティリティ。GAS のサービスに依存しない（Node でテスト可能）。
 */

/** 文字列化してトリム。null/undefined は空文字 */
function nz_(v) {
  if (v === null || v === undefined) return '';
  if (isDate_(v)) return formatIsoDate_(v);
  return String(v).trim();
}

/** 全角数字・記号を半角に */
function toHankaku_(s) {
  return nz_(s).replace(/[０-９Ａ-Ｚａ-ｚ－ー―]/g, function (ch) {
    if (ch === '－' || ch === 'ー' || ch === '―') return '-';
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

/** 数値化（全角対応）。数値でなければ null */
function toInt_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Math.round(v);
  var s = toHankaku_(v).replace(/[^0-9-]/g, '');
  if (s === '' || s === '-') return null;
  var n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/** 改行区切り → 配列（空行除去） */
function lines_(s) {
  return nz_(s).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
}

/** 年・月 → 比較用キー */
function ymKey_(y, m) {
  if (y === null || y === undefined) return null;
  return y * 12 + ((m || 1) - 1);
}

/** 日付パース: Date / "1997-05-10" / "1997/5/10" / "1997年5月10日" / "19970510" */
function parseDate_(v) {
  if (isDate_(v) && !isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  var s = toHankaku_(v);
  if (!s) return null;
  var m = s.match(/^(\d{4})[\/\-年.]\s*(\d{1,2})[\/\-月.]\s*(\d{1,2})日?$/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return isNaN(d.getTime()) ? null : d;
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

function formatIsoDate_(d) {
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}

/** 2026年9月13日 */
function formatJaDate_(d) {
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/** 20260913 */
function formatCompactDate_(d) {
  return '' + d.getFullYear() + pad2_(d.getMonth() + 1) + pad2_(d.getDate());
}

/** 満年齢 */
function calcAge_(birth, asOf) {
  var age = asOf.getFullYear() - birth.getFullYear();
  var beforeBirthday = asOf.getMonth() < birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** 2023年7月 / 空なら「現在」 */
function formatYm_(y, m, emptyLabel) {
  if (y === null || y === undefined) return emptyLabel || '現在';
  return y + '年' + (m || 1) + '月';
}

/** 期間表記: 2023年7月～現在 */
function formatPeriod_(sy, sm, ey, em) {
  return formatYm_(sy, sm, '') + '～' + formatYm_(ey, em, '現在');
}

/** 和暦らしき表記を検出 */
function hasWareki_(s) {
  return /(令和|平成|昭和|(^|[^A-Za-z])[RHS]\d{1,2}年)/.test(nz_(s));
}

/** 半角/全角の数字が混在していないか */
function hasZenkakuDigits_(s) {
  return /[０-９]/.test(nz_(s));
}

/** 文字数（改行・空白を除く） */
function charCount_(s) {
  return nz_(s).replace(/\s/g, '').length;
}

/** 数値（実績らしさ）を含むか */
function hasNumber_(s) {
  return /[0-9０-９]/.test(nz_(s));
}

function isEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nz_(s));
}

function isPostal_(s) {
  return /^\d{3}-?\d{4}$/.test(toHankaku_(s));
}

/** 名称の末尾に「取得」等が無ければ付ける（履歴書用） */
function withAcquired_(name) {
  var n = nz_(name);
  if (/(取得|合格|認定|修了|登録)$/.test(n)) return n;
  return n + ' 取得';
}

/** 配列を newest-first に並べる（職歴・プロジェクト用）。終了が空＝現在＝最も新しい */
function sortNewestFirst_(items) {
  return items.slice().sort(function (a, b) {
    var ka = a.endY === null ? Infinity : ymKey_(a.endY, a.endM);
    var kb = b.endY === null ? Infinity : ymKey_(b.endY, b.endM);
    if (ka !== kb) return kb - ka;
    return (ymKey_(b.startY, b.startM) || 0) - (ymKey_(a.startY, a.startM) || 0);
  });
}

function sortOldestFirst_(items) {
  return items.slice().sort(function (a, b) {
    return (ymKey_(a.startY, a.startM) || 0) - (ymKey_(b.startY, b.startM) || 0);
  });
}

/** 氏名からファイル名用の文字列（空白除去） */
function nameForFile_(name) {
  return nz_(name).replace(/[\s　]/g, '');
}

/** Date 判定（別レルムの Date でも真になるよう duck typing） */
function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}
