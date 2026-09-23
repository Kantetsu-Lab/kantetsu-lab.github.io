// GAS サービスの最小モック。src で使っているメソッドだけを、実 API と同じ名前・戻り値の形で再現する。
// 目的は「実行時に未定義メソッドや型の取り違えで落ちないこと」と「生成物の中身」の検証。見た目（書式）は検証しない。

let seq = 0;
const newId = (p) => `${p}${String(++seq).padStart(28, '0')}`;
const chain = (obj, names) => { for (const n of names) obj[n] = () => obj; return obj; };

// ---------------- DocumentApp
const T = { BODY_SECTION: 'BODY_SECTION', PARAGRAPH: 'PARAGRAPH', TABLE: 'TABLE', TABLE_ROW: 'TABLE_ROW', TABLE_CELL: 'TABLE_CELL', TEXT: 'TEXT' };

class El {
  constructor(type) { this.type = type; this.parent = null; this.children = []; }
  getType() { return this.type; }
  getParent() { return this.parent; }
  getNumChildren() { return this.children.length; }
  getChild(i) { if (i < 0 || i >= this.children.length) throw new Error('child index out of range: ' + i); return this.children[i]; }
  getChildIndex(c) { const i = this.children.indexOf(c); if (i < 0) throw new Error('not a child'); return i; }
  removeChild(c) { this.children.splice(this.getChildIndex(c), 1); c.parent = null; return this; }
  _add(c, i) { c.parent = this; if (i === undefined) this.children.push(c); else this.children.splice(i, 0, c); return c; }
  asParagraph() { if (this.type !== T.PARAGRAPH) throw new Error('not a paragraph: ' + this.type); return this; }
  asTable() { if (this.type !== T.TABLE) throw new Error('not a table'); return this; }
  asTableRow() { if (this.type !== T.TABLE_ROW) throw new Error('not a row'); return this; }
  getText() { return this.children.map((c) => c.getText()).join(this.type === T.TABLE_ROW ? '\t' : '\n'); }
  copy() { const c = cloneEl(this); c.parent = null; return c; }
  paragraphs() { return this.type === T.PARAGRAPH ? [this] : this.children.flatMap((c) => c.paragraphs()); }
  findText(pattern, from) {
    const re = new RegExp(pattern, 'g');
    const hits = [];
    for (const p of this.paragraphs()) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(p.text)) !== null) { if (m[0] === '') { re.lastIndex++; continue; } hits.push({ p, s: m.index, e: m.index + m[0].length - 1 }); }
    }
    let i = 0;
    if (from) { const k = hits.findIndex((h) => h.p === from._p && h.s === from._s); if (k < 0) return null; i = k + 1; }
    const h = hits[i];
    return h ? { _p: h.p, _s: h.s, getElement: () => h.p.editAsText(), getStartOffset: () => h.s, getEndOffsetInclusive: () => h.e } : null;
  }
  replaceText(pattern, repl) { for (const p of this.paragraphs()) p.text = p.text.replace(new RegExp(pattern, 'g'), () => repl); return null; }
  appendParagraph(text) { return this._add(new Para(text)); }
  appendTable(cells) { return this._add(new Table(cells)); }
  insertParagraph(i, text) { return this._add(new Para(text), i); }
  insertTable(i, table) { return this._add(table, i); }
}

class Para extends El {
  constructor(text) { super(T.PARAGRAPH); this.text = String(text ?? ''); this.images = 0; this.style = {}; chain(this, ['setAlignment', 'setSpacingBefore', 'setSpacingAfter', 'setLineSpacing', 'setIndentStart']); }
  getText() { return this.text; }
  setText(t) { this.text = String(t); return this; }
  appendText(t) { this.text += t; return this.editAsText(); }
  editAsText() {
    const p = this;
    const txt = {
      getType: () => T.TEXT, getParent: () => p, asText: () => txt, getText: () => p.text,
      deleteText: (s, e) => { p.text = p.text.slice(0, s) + p.text.slice(e + 1); return txt; },
      insertText: (o, v) => { p.text = p.text.slice(0, o) + v + p.text.slice(o); return txt; },
      setFontSize: (n) => { p.style.size = n; return txt; },
    };
    return chain(txt, ['setFontFamily', 'setBold', 'setForegroundColor']);
  }
  appendInlineImage() { this.images++; return chain({}, ['setWidth', 'setHeight']); }
}

class Cell extends El {
  constructor(text) { super(T.TABLE_CELL); this._add(new Para(text)); chain(this, ['setPaddingTop', 'setPaddingBottom', 'setPaddingLeft', 'setPaddingRight', 'setBackgroundColor', 'setVerticalAlignment']); }
  setText(t) { this.children = []; this._add(new Para(t)); return this; }
}
class Row extends El {
  constructor(cells) { super(T.TABLE_ROW); cells.forEach((t) => this._add(new Cell(t))); chain(this, ['setMinimumHeight']); }
  getCell(i) { return this.getChild(i); }
  getNumCells() { return this.children.length; }
}
class Table extends El {
  constructor(cells) { super(T.TABLE); cells.forEach((r) => this._add(new Row(r))); chain(this, ['setBorderWidth', 'setBorderColor', 'setColumnWidth']); }
  getRow(i) { return this.getChild(i); }
  getNumRows() { return this.children.length; }
  insertTableRow(i, row) { return this._add(row, i); }
}
class Body extends El {
  constructor() { super(T.BODY_SECTION); this._add(new Para('')); chain(this, ['setPageWidth', 'setPageHeight', 'setMarginTop', 'setMarginBottom', 'setMarginLeft', 'setMarginRight', 'setAttributes']); }
  getTables() { const out = []; const walk = (e) => { if (e.type === T.TABLE) out.push(e); e.children.forEach(walk); }; walk(this); return out; }
}
function cloneEl(e) {
  const c = Object.create(Object.getPrototypeOf(e));
  Object.assign(c, e);
  c.style = e.style ? { ...e.style } : undefined;
  c.children = e.children.map((k) => { const kc = cloneEl(k); kc.parent = c; return kc; });
  // chain() で付けたメソッドは this を閉じ込めているので付け直す
  for (const k of Object.keys(e)) if (typeof e[k] === 'function') c[k] = () => c;
  return c;
}

export function createGas() {
  const files = new Map(); // id -> file record
  const folders = new Map();
  const props = new Map();
  const fetchLog = [];

  function mkFolder(name, parent) {
    const f = { id: newId('F'), name, parent, kind: 'folder' };
    folders.set(f.id, f);
    return f;
  }
  const root = mkFolder('マイドライブ', null);
  const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };

  function folderApi(f) {
    return {
      getId: () => f.id, getName: () => f.name, getUrl: () => 'https://drive.google.com/drive/folders/' + f.id,
      getFoldersByName: (n) => iter([...folders.values()].filter((x) => x.parent === f.id && x.name === n).map(folderApi)),
      getFolders: () => iter([...folders.values()].filter((x) => x.parent === f.id).map(folderApi)),
      getFiles: () => iter([...files.values()].filter((x) => x.folder === f.id && !x.trashed).map(fileApi)),
      getParents: () => iter(f.parent ? [folderApi(folders.get(f.parent))] : []),
      createFolder: (n) => folderApi(mkFolder(n, f.id)),
      getFilesByName: (n) => iter([...files.values()].filter((x) => x.folder === f.id && x.name === n && !x.trashed).map(fileApi)),
      createFile: (blob) => fileApi(addFile({ name: blob.name, mime: blob.mime, folder: f.id, bytes: blob.bytes || [], text: blob.text })),
    };
  }
  function makeBlob(bytes, mime, name, src) {
    const buf = Buffer.from(bytes);
    return {
      name, mime, bytes: [...buf], src,
      getBytes: () => [...buf], getContentType: () => mime, getName: () => name,
      getDataAsString: (cs) => (cs && cs !== 'UTF-8' ? '[' + cs + ']' : '') + buf.toString('utf8'),
    };
  }
  function addFile(rec) { rec.id = rec.id || newId('D'); files.set(rec.id, rec); return rec; }
  function fileApi(r) {
    return {
      getId: () => r.id, getName: () => r.name, getMimeType: () => r.mime, getUrl: () => 'https://drive.google.com/file/d/' + r.id,
      moveTo: (folder) => { r.folder = folder.getId(); return fileApi(r); },
      getParents: () => iter(r.folder ? [folderApi(folders.get(r.folder))] : []),
      setTrashed: (v) => { r.trashed = v; return fileApi(r); },
      getBlob: () => makeBlob(r.bytes || Buffer.from(r.text || '', 'utf8'), r.mime, r.name, r),
      getAs: (mime) => { const b = { name: r.name, mime }; b.setName = (n) => { b.name = n; return b; }; return b; },
      makeCopy: (name, folder) => {
        const c = { name, mime: r.mime, folder: folder.getId() };
        if (r.doc) c.doc = cloneDoc(r.doc);
        if (r.ss) c.ss = cloneSs(r.ss);
        const rec = addFile(c);
        if (rec.doc) rec.doc.id = rec.id;
        if (rec.ss) rec.ss.id = rec.id;
        return fileApi(rec);
      },
    };
  }

  // ---- Document
  function makeDoc(name) {
    const d = { id: null, name, body: new Body(), closed: false };
    return d;
  }
  function cloneDoc(d) { return { ...d, body: cloneEl(d.body) }; }
  function docApi(d) {
    return { getBody: () => d.body, getId: () => d.id, getUrl: () => 'https://docs.google.com/document/d/' + d.id + '/edit', getHeader: () => null, getFooter: () => null, saveAndClose: () => { d.closed = true; } };
  }
  const DocumentApp = {
    ElementType: T,
    HorizontalAlignment: { LEFT: 'L', CENTER: 'C', RIGHT: 'R' },
    VerticalAlignment: { TOP: 'T', CENTER: 'C', BOTTOM: 'B' },
    Attribute: { FONT_FAMILY: 'ff', FONT_SIZE: 'fs', LINE_SPACING: 'ls', SPACING_BEFORE: 'sb', SPACING_AFTER: 'sa' },
    create: (name) => { const d = makeDoc(name); const rec = addFile({ name, mime: 'application/vnd.google-apps.document', folder: root.id, doc: d }); d.id = rec.id; return docApi(d); },
    openById: (id) => { const r = files.get(id); if (!r || !r.doc) throw new Error('doc not found ' + id); return docApi(r.doc); },
  };

  // ---- Spreadsheet
  function a1Col(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
  function makeSheet(name) { return { name, grid: [], notes: {}, maxRows: 1000 }; }
  function cloneSs(s) { return { ...s, sheets: s.sheets.map((sh) => ({ ...sh, grid: sh.grid.map((r) => r.slice()), notes: { ...sh.notes } })) }; }
  function lastRow(sh) { for (let r = sh.grid.length; r > 0; r--) if ((sh.grid[r - 1] || []).some((v) => v !== '' && v !== undefined && v !== null)) return r; return 0; }
  function lastCol(sh) { let m = 0; sh.grid.forEach((row) => { for (let c = row.length; c > 0; c--) if (row[c - 1] !== '' && row[c - 1] !== undefined && row[c - 1] !== null) { m = Math.max(m, c); break; } }); return m; }
  function get(sh, r, c) { const v = (sh.grid[r - 1] || [])[c - 1]; return v === undefined || v === null ? '' : v; }
  function put(sh, r, c, v) { while (sh.grid.length < r) sh.grid.push([]); const row = sh.grid[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
  function rangeApi(sh, r, c, nr, nc) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error(`invalid range ${r},${c},${nr},${nc}`);
    const api = {
      getRow: () => r, getColumn: () => c,
      getValue: () => get(sh, r, c),
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => get(sh, r + i, c + j))),
      setValue: (v) => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) put(sh, r + i, c + j, v); return api; },
      setValues: (vals) => {
        if (vals.length !== nr || vals.some((row) => row.length !== nc)) throw new Error(`setValues size mismatch: range ${nr}x${nc}, data ${vals.length}x${vals[0] && vals[0].length}`);
        vals.forEach((row, i) => row.forEach((v, j) => put(sh, r + i, c + j, v))); return api;
      },
      setNote: (n) => { sh.notes[`${r},${c}`] = n; return api; },
      copyTo: (dest) => {
        const vals = api.getValues();
        const r0 = dest.getRow(), c0 = dest.getColumn();
        vals.forEach((row, i) => row.forEach((v, j) => put(sh, r0 + i, c0 + j, v)));
        return api;
      },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (get(sh, r + i, c + j) !== '') put(sh, r + i, c + j, ''); return api; },
      insertCheckboxes: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (get(sh, r + i, c + j) === '') put(sh, r + i, c + j, false); return api; },
    };
    return chain(api, ['setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setVerticalAlignment', 'setNumberFormat', 'setDataValidation']);
  }
  function sheetApi(sh) {
    const api = {
      getName: () => sh.name,
      getRange: (a, b, nr, nc) => {
        if (typeof a === 'string') {
          const m = a.match(/^([A-Z]+):([A-Z]+)$/);
          if (!m) throw new Error('unsupported A1 ' + a);
          return rangeApi(sh, 1, a1Col(m[1]), sh.maxRows, a1Col(m[2]) - a1Col(m[1]) + 1);
        }
        return rangeApi(sh, a, b, nr || 1, nc || 1);
      },
      getDataRange: () => rangeApi(sh, 1, 1, Math.max(lastRow(sh), 1), Math.max(lastCol(sh), 1)),
      getLastRow: () => lastRow(sh), getLastColumn: () => lastCol(sh), getMaxRows: () => sh.maxRows,
      insertRowsAfter: (row, n) => { while (sh.grid.length < row) sh.grid.push([]); sh.grid.splice(row, 0, ...Array.from({ length: n }, () => [])); return api; },
      clear: () => { sh.grid = []; sh.notes = {}; return api; },
      createTextFinder: (text) => {
        let regex = false, whole = false;
        const tf = {
          matchEntireCell: (v) => { whole = v; return tf; },
          useRegularExpression: (v) => { regex = v; return tf; },
          _re: () => new RegExp(whole ? `^(?:${regex ? text : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$` : (regex ? text : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'g'),
          findAll: () => {
            const out = [];
            sh.grid.forEach((row, i) => row.forEach((v, j) => { if (typeof v === 'string' && tf._re().test(v)) out.push(rangeApi(sh, i + 1, j + 1, 1, 1)); }));
            return out;
          },
          replaceAllWith: (rep) => {
            let n = 0;
            sh.grid.forEach((row, i) => row.forEach((v, j) => { if (typeof v === 'string' && tf._re().test(v)) { row[j] = v.replace(tf._re(), () => rep); n++; } }));
            return n;
          },
        };
        return tf;
      },
    };
    return chain(api, ['setColumnWidth', 'setFrozenRows']);
  }
  function ssApi(s) {
    return {
      getId: () => s.id,
      getSheetByName: (n) => { const sh = s.sheets.find((x) => x.name === n); return sh ? sheetApi(sh) : null; },
      insertSheet: (n) => { if (s.sheets.some((x) => x.name === n)) throw new Error('duplicate sheet ' + n); const sh = makeSheet(n); s.sheets.push(sh); return sheetApi(sh); },
      getSheets: () => s.sheets.map(sheetApi),
      deleteSheet: (api) => { s.sheets = s.sheets.filter((x) => x.name !== api.getName()); },
      setActiveSheet: (api) => { s.active = api.getName(); return api; },
      moveActiveSheet: (pos) => { const i = s.sheets.findIndex((x) => x.name === s.active); const [sh] = s.sheets.splice(i, 1); s.sheets.splice(pos - 1, 0, sh); },
    };
  }
  function createSpreadsheet(name, sheetNames = ['シート1']) {
    const s = { id: null, name, sheets: sheetNames.map(makeSheet) };
    const rec = addFile({ name, mime: 'application/vnd.google-apps.spreadsheet', folder: root.id, ss: s });
    s.id = rec.id;
    return ssApi(s);
  }
  let active = null;
  const uiQueue = { prompts: [], alerts: [], shown: [], dialogs: [] };
  const Button = { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO', CLOSE: 'CLOSE' };
  const ui = {
    Button, ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO', YES_NO_CANCEL: 'YES_NO_CANCEL' },
    alert: (...a) => { uiQueue.shown.push(a.slice(0, 2).join(' | ')); return uiQueue.alerts.length ? uiQueue.alerts.shift() : Button.OK; },
    showModalDialog: (html, title) => { uiQueue.shown.push('DIALOG ' + title); uiQueue.dialogs.push(html); },
    prompt: (...a) => { uiQueue.shown.push('PROMPT ' + a[0]); const v = uiQueue.prompts.length ? uiQueue.prompts.shift() : ''; return { getSelectedButton: () => (v === null ? Button.CANCEL : Button.OK), getResponseText: () => v ?? '' }; },
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => active,
    openById: (id) => { const r = files.get(id); if (!r || !r.ss) throw new Error('ss not found'); return ssApi(r.ss); },
    flush: () => {},
    getUi: () => ui,
    newDataValidation: () => { const b = {}; return chain(b, ['requireValueInList', 'setAllowInvalid']) && Object.assign(b, { build: () => ({}) }); },
  };
  const DriveApp = {
    getFileById: (id) => { const r = files.get(id); if (!r) throw new Error('file not found ' + id); return fileApi(r); },
    getFolderById: (id) => { const f = folders.get(id); if (!f) throw new Error('folder not found ' + id); return folderApi(f); },
    getRootFolder: () => folderApi(root),
    getFoldersByName: (n) => iter([...folders.values()].filter((x) => x.name === n).map(folderApi)),
  };
  const PropertiesService = { getUserProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => { props.set(k, v); }, deleteProperty: (k) => { props.delete(k); } }) };
  let fetchHandler = () => ({ code: 500, body: '{}' });
  const UrlFetchApp = { fetch: (url, opt) => { fetchLog.push({ url, opt }); const r = fetchHandler(url, opt); return { getResponseCode: () => r.code, getContentText: () => r.body }; } };

  const HtmlService = { createHtmlOutput: (h) => { const o = { html: h }; o.setWidth = () => o; o.setHeight = () => o; return o; } };
  const Utilities = {
    base64Decode: (s) => [...Buffer.from(s, 'base64')],
    base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
    newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
  };
  const ScriptApp = { getOAuthToken: () => 'oauth-token' };
  // Drive 高度なサービス: 変換・OCR。変換後の本文は元ファイルの convertText（テスト側で設定）を使う
  const converted = [];
  const Drive = {
    Files: {
      create: (meta, blob, opt) => {
        const src = blob.src || {};
        converted.push({ meta, opt, from: src.name });
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          const id = DocumentApp.create(meta.name).getId();
          files.get(id).doc.body.appendParagraph(src.convertText || '');
          return { id };
        }
        if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
          const ss = createSpreadsheet(meta.name, ['Sheet1']);
          ss.getSheetByName('Sheet1').getRange(1, 1).setValue(src.convertText || '');
          return { id: ss.getId() };
        }
        const rec = addFile({ name: meta.name, mime: meta.mimeType, folder: root.id, exportText: src.convertText || '' });
        return { id: rec.id };
      },
    },
  };

  return {
    converted,
    addRawFile: (name, mime, folderId, extra = {}) => addFile({ name, mime, folder: folderId || root.id, ...extra }).id,
    globals: { DocumentApp, SpreadsheetApp, DriveApp, PropertiesService, UrlFetchApp, HtmlService, Utilities, ScriptApp, Drive, console },
    files, folders, props, fetchLog, uiQueue, root,
    setActive: (s) => { active = s; },
    setFetch: (h) => { fetchHandler = h; },
    createSpreadsheet,
    createDoc: (name, build) => { const d = DocumentApp.create(name); build(d.getBody()); return d.getId(); },
    docText: (id) => files.get(id).doc.body.getText(),
    docBody: (id) => files.get(id).doc.body,
    sheetGrid: (id, name) => files.get(id).ss.sheets.find((s) => s.name === name).grid,
    liveFiles: (folderId) => [...files.values()].filter((f) => f.folder === folderId && !f.trashed),
  };
}
