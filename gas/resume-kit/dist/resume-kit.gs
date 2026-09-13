/*
 * Kantetsu Lab 履歴書・職務経歴書ジェネレーター（Google Apps Script）
 * このファイルは gas/resume-kit/src/*.js から自動生成されています。直接編集せず src を直して `node gas/resume-kit/bundle.mjs` を実行してください。
 * generated: 2026-09-13T11:27:16.613Z
 */
// ===== 00_Config.js =====
/**
 * Kantetsu Lab 履歴書・職務経歴書ジェネレーター
 * 設定と定数。シート名・列定義はここだけを見れば分かるようにする。
 */

var KL = KL || {};

KL.VERSION = '1.0.0';
KL.MENU_TITLE = '履歴書ツール';

// シート名
KL.SHEET = {
  BASIC: '基本情報',
  EDUCATION: '学歴',
  JOBS: '職歴',
  PROJECTS: 'プロジェクト',
  SKILLS: '経験・能力',
  LICENSES: '免許・資格',
  ACHIEVEMENTS: '実績',
  TEXTS: '文章',
  SETTINGS: '設定',
  CHECK: 'チェック結果',
  AI: 'AI添削'
};

// 「項目 / 値 / 説明」形式のシートのキー定義
KL.BASIC_KEYS = [
  ['氏名', '', '例: 田中 太郎（姓と名の間に全角スペース）'],
  ['ふりがな', '', '例: たなか たろう'],
  ['生年月日', '', '例: 1997-05-10（西暦。満年齢は作成日基準で自動計算）'],
  ['性別', '', '任意。空欄なら履歴書に「※性別」欄は空白で出力'],
  ['郵便番号', '', '例: 162-0857'],
  ['現住所', '', '例: 東京都新宿区市谷山伏町2-5 プライムメゾン市谷山伏町103（建物名・部屋番号まで）'],
  ['現住所ふりがな', '', '例: とうきょうとしんじゅくくいちがややまぶしちょう'],
  ['電話', '', '固定電話。無ければ空欄'],
  ['携帯', '', '例: 080-0000-0000'],
  ['メール', '', '応募用のメールアドレス（人事はアドレスから姿勢を読む。真面目なものを）'],
  ['連絡先', '', '現住所以外に連絡を希望する場合のみ。空欄なら「同上」'],
  ['連絡先ふりがな', '', ''],
  ['作成日', '', '例: 2026-09-13。空欄なら生成した日'],
  ['通勤時間', '', '例: 約 1 時間 00 分'],
  ['扶養家族数', '0', '配偶者を除く人数'],
  ['配偶者', '無', '有 / 無'],
  ['配偶者の扶養義務', '無', '有 / 無'],
  ['志望の動機・特技・アピールポイント', '', '履歴書の「志望の動機、特技、好きな学科、アピールポイントなど」欄'],
  ['本人希望記入欄', '貴社の規定に従います。', '給与・職種・勤務地などの希望。特になければこのまま'],
  ['写真ファイルID', '', '任意。Google ドライブ上の顔写真ファイルのID（URLの /d/ と /view の間）。空欄なら枠のみ']
];

KL.TEXT_KEYS = [
  ['職務要約', '', '職務経歴書の冒頭。200〜400字目安。経歴の流れ→現職での実績（数値）→強みの順'],
  ['自己PR', '', '300〜600字目安。「貴社の〜に貢献できる」で結ぶ']
];

KL.SETTING_KEYS = [
  ['出力フォルダID', '', '空欄ならこのスプレッドシートと同じ場所に「履歴書_出力」フォルダを自動作成'],
  ['履歴書フォント', 'Noto Serif JP', 'Google ドキュメントで使えるフォント名'],
  ['職務経歴書フォント', 'Noto Sans JP', ''],
  ['ファイル名の接頭辞', '', '例: KL_ → KL_履歴書_田中太郎_20260913'],
  ['PDFも出力', 'はい', 'はい / いいえ'],
  ['AIモデル', 'claude-opus-5', 'AI添削で使う Claude のモデルID'],
  ['AI思考の深さ', 'medium', 'low / medium / high（高いほど時間がかかる。GAS の通信制限内に収めるなら medium 推奨）']
];

// 表形式シートの見出し
KL.HEADERS = {};
KL.HEADERS[KL.SHEET.EDUCATION] = ['年', '月', '学校名・学部・学科', '区分'];
KL.HEADERS[KL.SHEET.JOBS] = [
  '入社年', '入社月', '退社年', '退社月', '会社名', '雇用形態', '部門・職位',
  '退社理由（履歴書用）', '事業内容', '資本金', '売上高', '上場', '従業員数'
];
KL.HEADERS[KL.SHEET.PROJECTS] = [
  '会社名', 'プロジェクト名', '開始年', '開始月', '終了年', '終了月',
  '役割・規模', 'プロジェクト概要', '支援内容（1行1項目）', '成果・実績'
];
KL.HEADERS[KL.SHEET.SKILLS] = [
  '見出し', '本文', 'ミッション', '目標数字', '課題', '工夫点', '結果'
];
KL.HEADERS[KL.SHEET.LICENSES] = ['年', '月', '名称', '区分', '履歴書に載せる'];
KL.HEADERS[KL.SHEET.ACHIEVEMENTS] = ['区分', '内容'];

// 見出しセルに付けるメモ（入力ガイド）
KL.HEADER_NOTES = {};
KL.HEADER_NOTES[KL.SHEET.EDUCATION] = [
  '西暦4桁（例: 2017）', '1〜12', '例: 東京薬科大学 薬学部 医療衛生薬学科（高校から記載）', '入学 / 卒業 / 中退 / 修了 / 転入 / 編入'
];
KL.HEADER_NOTES[KL.SHEET.JOBS] = [
  '西暦4桁', '1〜12', '在職中なら空欄', '在職中なら空欄', '正式名称（株式会社を略さない）',
  '正社員 / 契約社員 / 派遣社員 / パート / アルバイト / 業務委託 / 個人事業主 など。正社員以外は必ず記入（無記載＝正社員とみなされる）',
  '例: 調剤薬局／業務改善・DX推進担当', '例: 一身上の都合により退社（空欄ならこの文言）',
  '職務経歴書の会社概要に使用', '例: 300万円（2015年12月時点）', '例: 4億1,090万円（2025年9月時点）', '例: 未上場 / 東証プライム市場', '例: 31人'
];
KL.HEADER_NOTES[KL.SHEET.PROJECTS] = [
  '職歴シートの会社名と完全一致させる', '例: 社内AI推進・業務改善プロジェクト', '西暦4桁', '1〜12', '継続中なら空欄', '継続中なら空欄',
  '例: 業務改善・AI活用企画担当。複数店舗（4店舗）を横断', '背景→課題→何をしたか。3〜6行',
  '1行に1項目。「・」は付けない（自動付与）', '数値で。例: 待ち時間 20分→8分（60%削減）'
];
KL.HEADER_NOTES[KL.SHEET.SKILLS] = [
  '例: 課題解決力 / 業務改善力', '本文を直接書く場合。空欄なら右の5要素から自動生成',
  '現職での役割', '自分で設定した数値目標と、その数字を置いた理由', '目標達成のための課題（〇〇率など）', '独自の施策・圧倒的な取り組み', '目標に対する達成度（数値）'
];
KL.HEADER_NOTES[KL.SHEET.LICENSES] = [
  '西暦4桁', '1〜12', '正式名称。例: 薬剤師免許 / 普通自動車第一種運転免許', '免許・資格 / 語学 / ツール・技術', '○ なら履歴書の免許・資格欄に出す（語学・ツールは職務経歴書のみ推奨）'
];
KL.HEADER_NOTES[KL.SHEET.ACHIEVEMENTS] = ['表彰 / 登壇 / その他', '1行1件'];

// データ検証（プルダウン）
KL.VALIDATION = {};
KL.VALIDATION[KL.SHEET.EDUCATION] = { col: 4, values: ['入学', '卒業', '中退', '修了', '転入', '編入', '卒業見込'] };
KL.VALIDATION[KL.SHEET.JOBS] = { col: 6, values: ['正社員', '契約社員', '派遣社員', 'パート', 'アルバイト', '業務委託', '個人事業主', '役員', 'インターン'] };
KL.VALIDATION[KL.SHEET.LICENSES] = { col: 4, values: ['免許・資格', '語学', 'ツール・技術'] };
KL.VALIDATION[KL.SHEET.ACHIEVEMENTS] = { col: 1, values: ['表彰', '登壇', 'その他'] };

// 用紙（A4, pt）
KL.PAGE = { W: 595.3, H: 841.9, MARGIN: 40 };
KL.CONTENT_W = KL.PAGE.W - KL.PAGE.MARGIN * 2; // ≒515

// 履歴書の最低行数（フォームらしい見た目のため空行で埋める）
KL.MIN_HISTORY_ROWS = 18;
KL.MIN_LICENSE_ROWS = 5;

// AI 添削の観点（Kantetsu Lab 標準）。プロンプトに埋め込む
KL.REVIEW_RULES = [
  '# 添削の観点（Kantetsu Lab 標準）',
  '1. 事実の正確さ: 学歴・職歴は西暦で統一。在籍期間（入社年月・退職年月）、雇用形態（正社員以外は必ず明記）を確認する。1年以上の学歴空白、1ヶ月以上の職歴空白があれば指摘し、理由の書き方を提案する。',
  '2. 一貫性: 高校→大学→1社目→転職理由→将来像が何かしら一本の線でつながっているか。つながっていなければ、無理に作らず「どの軸で語れば一貫するか」を提案する。',
  '3. 再現性: 実績は「何を出したか」ではなく「どういう考え方で出したか」。ミッション→目標数字（なぜその数字か）→課題→工夫点→結果 の順で書けているか。数値が無い実績には数値化の質問を返す。',
  '4. 抽象度: 新卒時ほど抽象的でよく、直近ほど具体的に。方向性が変わる箇所には橋渡しの一文を提案する。',
  '5. For You / For Me: 一次回答は貢献（For You）、掘り下げは自分の実力向上（For Me）でバランスを取る。自己PR・志望動機がどちらかに偏っていれば指摘する。',
  '6. 職務要約は200〜400字、自己PRは300〜600字。冒頭で数値実績を1つ見せる。',
  '7. 表記: 会社名は正式名称、資格は正式名称、半角数字、「貴社」表記、敬体・常体の混在なし。',
  '8. 出力形式: (a) 総評3行 (b) 重大な修正（事実・整合性）(c) 改善提案（優先度順、修正前→修正後の文例つき）(d) 面接で突っ込まれそうな点 の4部構成。日本語で。'
];


// ===== 10_Util.js =====
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


// ===== 20_Data.js =====
/**
 * スプレッドシート → モデル（プレーンなオブジェクト）
 * ここより下（Check / Rirekisho / Shokumu / AiReview）はモデルだけを見る。
 */

/** シートの全値を 2 次元配列で返す。シートが無ければ [] */
function sheetValues_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var rng = sh.getDataRange();
  if (!rng) return [];
  return rng.getValues();
}

/** 「項目 / 値」形式のシートを { key: value } に */
function readKeyValue_(ss, name) {
  var out = {};
  var rows = sheetValues_(ss, name);
  for (var i = 1; i < rows.length; i++) {
    var k = nz_(rows[i][0]);
    if (!k) continue;
    var v = rows[i][1];
    out[k] = isDate_(v) ? v : nz_(v);
  }
  return out;
}

/** 表形式シートを見出し行をキーにしたオブジェクト配列に（空行は飛ばす） */
function readTable_(ss, name) {
  var rows = sheetValues_(ss, name);
  if (rows.length < 2) return [];
  var headers = rows[0].map(nz_);
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var rec = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var v = rows[i][c];
      rec[headers[c]] = v;
      if (nz_(v) !== '') empty = false;
    }
    if (!empty) {
      rec.__row = i + 1;
      out.push(rec);
    }
  }
  return out;
}

/** モデル生成 */
function loadModel(ss) {
  var basicRaw = readKeyValue_(ss, KL.SHEET.BASIC);
  var texts = readKeyValue_(ss, KL.SHEET.TEXTS);
  var settingsRaw = readKeyValue_(ss, KL.SHEET.SETTINGS);

  var settings = {};
  KL.SETTING_KEYS.forEach(function (k) {
    settings[k[0]] = nz_(settingsRaw[k[0]]) || k[1];
  });

  var basic = {};
  KL.BASIC_KEYS.forEach(function (k) {
    var v = basicRaw[k[0]];
    basic[k[0]] = isDate_(v) ? v : (nz_(v) || k[1]);
  });

  var asOf = parseDate_(basic['作成日']) || new Date();
  asOf = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  var birth = parseDate_(basic['生年月日']);

  var education = readTable_(ss, KL.SHEET.EDUCATION).map(function (r) {
    return {
      row: r.__row,
      year: toInt_(r['年']),
      month: toInt_(r['月']),
      school: nz_(r['学校名・学部・学科']),
      kind: nz_(r['区分'])
    };
  });

  var jobs = readTable_(ss, KL.SHEET.JOBS).map(function (r) {
    return {
      row: r.__row,
      startY: toInt_(r['入社年']), startM: toInt_(r['入社月']),
      endY: toInt_(r['退社年']), endM: toInt_(r['退社月']),
      company: nz_(r['会社名']),
      employment: nz_(r['雇用形態']),
      position: nz_(r['部門・職位']),
      leaveReason: nz_(r['退社理由（履歴書用）']),
      business: nz_(r['事業内容']),
      capital: nz_(r['資本金']),
      sales: nz_(r['売上高']),
      listing: nz_(r['上場']),
      employees: nz_(r['従業員数'])
    };
  });

  var projects = readTable_(ss, KL.SHEET.PROJECTS).map(function (r) {
    return {
      row: r.__row,
      company: nz_(r['会社名']),
      name: nz_(r['プロジェクト名']),
      startY: toInt_(r['開始年']), startM: toInt_(r['開始月']),
      endY: toInt_(r['終了年']), endM: toInt_(r['終了月']),
      role: nz_(r['役割・規模']),
      overview: nz_(r['プロジェクト概要']),
      tasks: lines_(r['支援内容（1行1項目）']),
      results: nz_(r['成果・実績'])
    };
  });

  var skills = readTable_(ss, KL.SHEET.SKILLS).map(function (r) {
    return {
      row: r.__row,
      title: nz_(r['見出し']),
      body: nz_(r['本文']),
      mission: nz_(r['ミッション']),
      target: nz_(r['目標数字']),
      issue: nz_(r['課題']),
      ingenuity: nz_(r['工夫点']),
      result: nz_(r['結果'])
    };
  });

  var licenses = readTable_(ss, KL.SHEET.LICENSES).map(function (r) {
    return {
      row: r.__row,
      year: toInt_(r['年']), month: toInt_(r['月']),
      name: nz_(r['名称']),
      kind: nz_(r['区分']) || '免許・資格',
      onRirekisho: /^(○|〇|◯|はい|yes|true|1)$/i.test(nz_(r['履歴書に載せる']))
    };
  });

  var achievements = readTable_(ss, KL.SHEET.ACHIEVEMENTS).map(function (r) {
    return { row: r.__row, kind: nz_(r['区分']) || 'その他', text: nz_(r['内容']) };
  });

  return {
    basic: basic,
    asOf: asOf,
    birth: birth,
    age: birth ? calcAge_(birth, asOf) : null,
    education: education,
    jobs: jobs,
    projects: projects,
    skills: skills,
    licenses: licenses,
    achievements: achievements,
    texts: { summary: nz_(texts['職務要約']), pr: nz_(texts['自己PR']) },
    settings: settings
  };
}

/** 経験・能力の本文。空なら 5 要素（再現性フォーマット）から組み立てる */
function skillBodyLines_(sk) {
  if (sk.body) return lines_(sk.body);
  var out = [];
  if (sk.mission) out.push('【ミッション】' + sk.mission);
  if (sk.target) out.push('【目標】' + sk.target);
  if (sk.issue) out.push('【課題】' + sk.issue);
  if (sk.ingenuity) out.push('【工夫点】' + sk.ingenuity);
  if (sk.result) out.push('【結果】' + sk.result);
  return out;
}


// ===== 30_Check.js =====
/**
 * 入力チェック。
 * ルールの出典: 大手ファーム選考時の「応募書類確認にあたっての留意点」＋キャリア面談メモ（一貫性・再現性）。
 * 結果は { level: 'ERROR'|'WARN'|'INFO', where: シート名, item: 対象, message } の配列。
 */

function runChecks(model) {
  var out = [];
  function add(level, where, item, message) {
    out.push({ level: level, where: where, item: item, message: message });
  }
  var b = model.basic;

  // ---- 基本情報
  ['氏名', 'ふりがな', '生年月日', '郵便番号', '現住所', '現住所ふりがな', 'メール'].forEach(function (k) {
    if (!nz_(b[k])) add('ERROR', KL.SHEET.BASIC, k, '未入力です。');
  });
  if (nz_(b['生年月日']) && !model.birth) add('ERROR', KL.SHEET.BASIC, '生年月日', '日付として読めません。例: 1997-05-10');
  if (!nz_(b['電話']) && !nz_(b['携帯'])) add('ERROR', KL.SHEET.BASIC, '電話/携帯', 'どちらか一方は必要です。');
  if (nz_(b['メール']) && !isEmail_(b['メール'])) add('ERROR', KL.SHEET.BASIC, 'メール', '形式が正しくありません。');
  if (nz_(b['郵便番号']) && !isPostal_(b['郵便番号'])) add('WARN', KL.SHEET.BASIC, '郵便番号', '123-4567 の形式にしてください。');
  if (nz_(b['ふりがな']) && /[ァ-ヶ]/.test(b['ふりがな'])) add('WARN', KL.SHEET.BASIC, 'ふりがな', 'カタカナが含まれています。「ふりがな」欄はひらがなで統一します。');
  if (nz_(b['現住所']) && !/[0-9０-９]/.test(b['現住所'])) add('WARN', KL.SHEET.BASIC, '現住所', '番地が含まれていないようです。建物名・部屋番号まで記載してください。');
  if (nz_(b['メール']) && /(love|kawaii|xxx|yolo|\d{6,})/i.test(b['メール'])) add('WARN', KL.SHEET.BASIC, 'メール', '人事はアドレスから仕事への姿勢を読みます。氏名ベースのアドレスを推奨。');
  if (!nz_(b['志望の動機・特技・アピールポイント'])) add('WARN', KL.SHEET.BASIC, '志望の動機・特技・アピールポイント', '空欄です。応募先ごとに書き分けるのが基本。');
  ['配偶者', '配偶者の扶養義務'].forEach(function (k) {
    if (nz_(b[k]) && !/^(有|無)$/.test(nz_(b[k]))) add('WARN', KL.SHEET.BASIC, k, '「有」か「無」で入力してください。');
  });

  // ---- 学歴
  if (model.education.length === 0) add('ERROR', KL.SHEET.EDUCATION, '-', '学歴がありません。高校から記載します。');
  var eduSorted = model.education.slice().sort(function (a, c) { return (ymKey_(a.year, a.month) || 0) - (ymKey_(c.year, c.month) || 0); });
  model.education.forEach(function (e) {
    if (e.year === null || e.month === null) add('ERROR', KL.SHEET.EDUCATION, e.school || ('行' + e.row), '年・月が未入力です。');
    if (!e.school) add('ERROR', KL.SHEET.EDUCATION, '行' + e.row, '学校名が未入力です。');
    if (!e.kind) add('WARN', KL.SHEET.EDUCATION, e.school, '区分（入学/卒業など）が未入力です。');
    if (hasWareki_(e.school)) add('WARN', KL.SHEET.EDUCATION, e.school, '和暦が含まれています。西暦で統一します。');
  });
  for (var i = 1; i < eduSorted.length; i++) {
    var prev = eduSorted[i - 1], cur = eduSorted[i];
    if (prev.year === null || cur.year === null) continue;
    if (/(卒業|修了|中退)/.test(prev.kind) && /(入学|編入|転入)/.test(cur.kind)) {
      var gap = ymKey_(cur.year, cur.month) - ymKey_(prev.year, prev.month);
      if (gap >= 12) add('WARN', KL.SHEET.EDUCATION, cur.school, '直前の学歴との間に ' + gap + 'ヶ月の空白があります（1年以上の空白は理由を聞かれます）。');
    }
  }
  var hasGraduation = model.education.some(function (e) { return /(卒業|修了)/.test(e.kind); });
  if (model.education.length > 0 && !hasGraduation) add('WARN', KL.SHEET.EDUCATION, '-', '「卒業」または「修了」の行がありません。');

  // ---- 職歴
  if (model.jobs.length === 0) add('WARN', KL.SHEET.JOBS, '-', '職歴がありません（新卒なら問題なし）。');
  var jobsSorted = sortOldestFirst_(model.jobs);
  model.jobs.forEach(function (j) {
    var label = j.company || ('行' + j.row);
    if (!j.company) add('ERROR', KL.SHEET.JOBS, '行' + j.row, '会社名が未入力です。');
    if (j.startY === null || j.startM === null) add('ERROR', KL.SHEET.JOBS, label, '入社年月が未入力です。');
    if ((j.endY === null) !== (j.endM === null)) add('ERROR', KL.SHEET.JOBS, label, '退社年と退社月は両方入力するか、両方空欄（在職中）にしてください。');
    if (!j.employment) add('ERROR', KL.SHEET.JOBS, label, '雇用形態が未入力です。無記載は「正社員」とみなされ、相違があると内定取消の対象になります。');
    if (j.endY !== null && ymKey_(j.endY, j.endM) < ymKey_(j.startY, j.startM)) add('ERROR', KL.SHEET.JOBS, label, '退社が入社より前になっています。');
    if (/株\)|\(株\)|㈱/.test(j.company)) add('WARN', KL.SHEET.JOBS, label, '会社名は「株式会社」を省略せず正式名称で。');
    if (hasWareki_(j.company + j.position)) add('WARN', KL.SHEET.JOBS, label, '和暦が含まれています。西暦で統一します。');
    if (!j.business) add('INFO', KL.SHEET.JOBS, label, '事業内容が空欄です。職務経歴書の会社概要が薄くなります。');
  });
  var current = model.jobs.filter(function (j) { return j.endY === null; });
  if (current.length > 1) add('WARN', KL.SHEET.JOBS, '-', '在職中（退社年月が空欄）の会社が ' + current.length + ' 社あります。副業・兼業なら雇用形態で明示してください。');
  for (var k = 1; k < jobsSorted.length; k++) {
    var pj = jobsSorted[k - 1], cj = jobsSorted[k];
    if (pj.endY === null || cj.startY === null) continue;
    var g = ymKey_(cj.startY, cj.startM) - ymKey_(pj.endY, pj.endM);
    if (g >= 2) add('WARN', KL.SHEET.JOBS, cj.company, '前職退社から ' + (g - 1) + 'ヶ月の空白があります（1ヶ月以上の空白は理由を聞かれます）。');
    if (g < 0) add('WARN', KL.SHEET.JOBS, cj.company, '前職と在籍期間が重なっています。副業・兼業なら雇用形態で明示してください。');
  }
  // 学歴の最終卒業と初職の空白
  var lastGrad = eduSorted.filter(function (e) { return /(卒業|修了)/.test(e.kind) && e.year !== null; }).pop();
  if (lastGrad && jobsSorted.length > 0 && jobsSorted[0].startY !== null) {
    var g2 = ymKey_(jobsSorted[0].startY, jobsSorted[0].startM) - ymKey_(lastGrad.year, lastGrad.month);
    if (g2 >= 2) add('WARN', KL.SHEET.JOBS, jobsSorted[0].company, '最終学歴卒業から初職まで ' + (g2 - 1) + 'ヶ月の空白があります。');
  }

  // ---- プロジェクト
  var companyNames = model.jobs.map(function (j) { return j.company; });
  model.projects.forEach(function (p) {
    var label = p.name || ('行' + p.row);
    if (!p.company) add('ERROR', KL.SHEET.PROJECTS, label, '会社名が未入力です。');
    else if (companyNames.indexOf(p.company) < 0) add('ERROR', KL.SHEET.PROJECTS, label, '会社名「' + p.company + '」が職歴シートにありません（完全一致が必要）。');
    if (!p.name) add('ERROR', KL.SHEET.PROJECTS, '行' + p.row, 'プロジェクト名が未入力です。');
    if (p.startY === null) add('WARN', KL.SHEET.PROJECTS, label, '開始年月が未入力です。');
    if (!p.overview) add('WARN', KL.SHEET.PROJECTS, label, 'プロジェクト概要が空欄です。');
    if (p.tasks.length === 0) add('WARN', KL.SHEET.PROJECTS, label, '支援内容が空欄です。');
    if (!hasNumber_(p.results) && !hasNumber_(p.overview)) add('WARN', KL.SHEET.PROJECTS, label, '数値の実績がありません。「何を」より「どの考え方で結果を出したか」＋数値で再現性を示します。');
    var job = model.jobs.filter(function (j) { return j.company === p.company; })[0];
    if (job && p.startY !== null && job.startY !== null && ymKey_(p.startY, p.startM) < ymKey_(job.startY, job.startM)) {
      add('WARN', KL.SHEET.PROJECTS, label, 'プロジェクト開始が入社より前になっています。');
    }
  });
  model.jobs.forEach(function (j) {
    if (!model.projects.some(function (p) { return p.company === j.company; })) {
      add('INFO', KL.SHEET.PROJECTS, j.company, 'プロジェクト（業務詳細）がありません。職務経歴書では部門・職位のみ表示されます。');
    }
  });

  // ---- 経験・能力
  if (model.skills.length === 0) add('WARN', KL.SHEET.SKILLS, '-', '「活かせる経験・能力」がありません。2〜3件が目安。');
  model.skills.forEach(function (s) {
    var label = s.title || ('行' + s.row);
    var body = skillBodyLines_(s).join('');
    if (!s.title) add('ERROR', KL.SHEET.SKILLS, '行' + s.row, '見出しが未入力です。');
    if (!body) add('ERROR', KL.SHEET.SKILLS, label, '本文も5要素も空欄です。');
    else {
      if (!hasNumber_(body)) add('WARN', KL.SHEET.SKILLS, label, '数値がありません。目標数字と結果を入れてください。');
      if (!s.body && !(s.mission && s.target && s.issue && s.ingenuity && s.result)) add('WARN', KL.SHEET.SKILLS, label, '再現性フォーマット（ミッション→目標数字→課題→工夫点→結果）に空きがあります。');
      if (charCount_(body) < 150) add('INFO', KL.SHEET.SKILLS, label, '本文が短めです（' + charCount_(body) + '字）。背景→課題→打ち手→結果で 200〜400字が目安。');
    }
  });

  // ---- 免許・資格
  model.licenses.forEach(function (l) {
    var label = l.name || ('行' + l.row);
    if (!l.name) add('ERROR', KL.SHEET.LICENSES, '行' + l.row, '名称が未入力です。');
    if (l.onRirekisho && (l.year === null || l.month === null)) add('ERROR', KL.SHEET.LICENSES, label, '履歴書に載せる資格は年・月が必要です。');
    if (/普通免許$/.test(l.name)) add('WARN', KL.SHEET.LICENSES, label, '正式名称「普通自動車第一種運転免許」で記載します。');
  });
  if (!model.licenses.some(function (l) { return l.onRirekisho; })) add('INFO', KL.SHEET.LICENSES, '-', '履歴書に載せる資格がありません（無ければ「特になし」と出力）。');

  // ---- 文章
  var sc = charCount_(model.texts.summary);
  if (!sc) add('ERROR', KL.SHEET.TEXTS, '職務要約', '未入力です。');
  else if (sc < 150 || sc > 500) add('WARN', KL.SHEET.TEXTS, '職務要約', sc + '字です。200〜400字が目安。');
  var pc = charCount_(model.texts.pr);
  if (!pc) add('WARN', KL.SHEET.TEXTS, '自己PR', '未入力です。');
  else if (pc < 200 || pc > 700) add('WARN', KL.SHEET.TEXTS, '自己PR', pc + '字です。300〜600字が目安。');
  if (model.texts.summary && !hasNumber_(model.texts.summary)) add('WARN', KL.SHEET.TEXTS, '職務要約', '数値実績がありません。冒頭で読み手を掴むために 1 つは入れます。');

  // ---- 全体: 和暦・全角数字
  var allText = [b['現住所'], model.texts.summary, model.texts.pr]
    .concat(model.projects.map(function (p) { return p.overview + p.tasks.join('') + p.results; }))
    .concat(model.skills.map(function (s) { return skillBodyLines_(s).join(''); })).join('\n');
  if (hasWareki_(allText)) add('WARN', '全体', '-', '和暦表記が含まれています。書類全体で西暦に統一します。');
  if (hasZenkakuDigits_(allText)) add('INFO', '全体', '-', '全角数字が含まれています。半角に統一すると読みやすくなります。');

  return out;
}

/** 集計 */
function summarizeChecks_(results) {
  var c = { ERROR: 0, WARN: 0, INFO: 0 };
  results.forEach(function (r) { c[r.level] = (c[r.level] || 0) + 1; });
  return c;
}


// ===== 40_DocHelpers.js =====
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


// ===== 50_Rirekisho.js =====
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


// ===== 60_Shokumu.js =====
/**
 * 職務経歴書（コンサル・IT 業界向け標準構成、A4 縦）
 *  構成: 職務要約 → 活かせる経験・能力 → 職務経歴（所属企業） → 職務経歴詳細 → 実績 → 語学・資格 → 自己PR → 以上
 */

function composeShokumu_(model) {
  var jobs = sortNewestFirst_(model.jobs);
  var companies = jobs.map(function (j) {
    var info = [];
    if (j.employment) info.push('雇用形態：' + j.employment);
    if (j.business) info.push('事業内容：' + j.business);
    if (j.capital) info.push('資本金：' + j.capital);
    if (j.sales) info.push('売上高：' + j.sales);
    if (j.listing) info.push('上場：' + j.listing);
    if (j.employees) info.push('従業員数：' + j.employees);
    var projects = sortNewestFirst_(model.projects.filter(function (p) { return p.company === j.company; }))
      .map(function (p) {
        var overview = [];
        if (p.overview) overview.push('【プロジェクト概要】');
        overview = overview.concat(lines_(p.overview));
        if (p.tasks.length) {
          overview.push('【支援内容】');
          p.tasks.forEach(function (tk) { overview.push('・' + tk.replace(/^[・\-•]\s*/, '')); });
        }
        if (p.results) {
          overview.push('【成果】');
          overview = overview.concat(lines_(p.results));
        }
        return {
          name: p.name,
          period: formatPeriod_(p.startY, p.startM, p.endY, p.endM),
          role: lines_(p.role),
          overview: overview
        };
      });
    return {
      header: formatPeriod_(j.startY, j.startM, j.endY, j.endM) + '　' + j.company,
      info: info,
      position: j.position,
      projects: projects
    };
  });

  var groups = {};
  model.licenses.forEach(function (l) {
    var k = l.kind || '免許・資格';
    if (!groups[k]) groups[k] = [];
    var s = l.name;
    if (l.year !== null) s += '（' + formatYm_(l.year, l.month) + '）';
    groups[k].push(s);
  });
  var licenseGroups = ['免許・資格', '語学', 'ツール・技術'].filter(function (k) { return groups[k]; })
    .map(function (k) { return { title: k, items: groups[k] }; });

  var ach = {};
  model.achievements.forEach(function (a) {
    if (!a.text) return;
    if (!ach[a.kind]) ach[a.kind] = [];
    ach[a.kind].push(a.text);
  });
  var achievementGroups = ['表彰', '登壇', 'その他'].filter(function (k) { return ach[k]; })
    .map(function (k) { return { title: k, items: ach[k] }; });

  return {
    dateLabel: formatJaDate_(model.asOf) + ' 現在',
    name: nz_(model.basic['氏名']),
    age: model.age,
    summary: lines_(model.texts.summary),
    skills: model.skills.map(function (s) { return { title: s.title, lines: skillBodyLines_(s) }; }),
    jobRows: jobs.map(function (j) {
      return [formatPeriod_(j.startY, j.startM, j.endY, j.endM), j.company, (j.employment || '') + (j.position ? '（' + j.position + '）' : '')];
    }),
    companies: companies,
    achievementGroups: achievementGroups,
    licenseGroups: licenseGroups,
    pr: lines_(model.texts.pr)
  };
}

function buildShokumuDoc_(model, ss) {
  var d = composeShokumu_(model);
  var font = model.settings['職務経歴書フォント'] || 'Noto Sans JP';
  var doc = newA4Doc_(outputFileName_(model, '職務経歴書'), font, 10);
  var body = doc.getBody();
  var base = { font: font, size: 10 };
  var head = { font: font, size: 9, bold: true, bg: '#e8e8e8', align: 'center' };

  addPara_(body, '職 務 経 歴 書', { font: font, size: 16, bold: true, align: 'center', after: 6 });
  addPara_(body, d.dateLabel, { font: font, size: 10, align: 'right' });
  addPara_(body, '氏名：' + d.name + (d.age !== null ? '（' + d.age + '歳）' : ''), { font: font, size: 10, align: 'right' });

  // ■職務要約
  addSectionHeading_(body, '職務要約', font);
  d.summary.forEach(function (l) { addPara_(body, l, base); });

  // ■活かせる経験・能力・知識・技術
  if (d.skills.length) {
    addSectionHeading_(body, '活かせる経験・能力・知識・技術', font);
    d.skills.forEach(function (s) {
      addPara_(body, '【' + s.title + '】', { font: font, size: 10, bold: true, before: 4 });
      s.lines.forEach(function (l) { addPara_(body, l, base); });
    });
  }

  // ■職務経歴（所属企業）
  addSectionHeading_(body, '職務経歴（所属企業）', font);
  var jw = [130, 190, KL.CONTENT_W - 320];
  var jt = newTable_(body, d.jobRows.length + 1, 3, jw, 0.75);
  var hr = jt.getRow(0);
  setCell_(hr.getCell(0), '在籍期間', head);
  setCell_(hr.getCell(1), '所属企業名称', head);
  setCell_(hr.getCell(2), '雇用形態（所属部門/職位）', head);
  d.jobRows.forEach(function (row, i) {
    var r = jt.getRow(i + 1);
    setCell_(r.getCell(0), row[0], { font: font, size: 9, align: 'center' });
    setCell_(r.getCell(1), row[1], { font: font, size: 9 });
    setCell_(r.getCell(2), row[2], { font: font, size: 9 });
  });

  // ■職務経歴詳細
  addSectionHeading_(body, '職務経歴詳細', font);
  var dw = [90, KL.CONTENT_W - 90];
  d.companies.forEach(function (c) {
    // 行数を先に数える
    var rowCount = 2; // header + info
    if (c.projects.length === 0) rowCount += 1;
    c.projects.forEach(function () { rowCount += 4; });
    var t = newTable_(body, rowCount, 2, dw, 0.75);
    var idx = 0;
    var r = t.getRow(idx++);
    setCell_(mergeCells_(r, 0, 1), c.header, { font: font, size: 10, bold: true, bg: '#e8e8e8' });
    r = t.getRow(idx++);
    setCell_(mergeCells_(r, 0, 1), c.info.length ? c.info : [''], { font: font, size: 8 });
    if (c.projects.length === 0) {
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '担当業務', { font: font, size: 9, align: 'center', bg: '#f6f6f6' });
      setCell_(r.getCell(1), c.position || '', { font: font, size: 9 });
    }
    c.projects.forEach(function (p) {
      r = t.getRow(idx++);
      setCell_(mergeCells_(r, 0, 1), p.name, { font: font, size: 10, bold: true, bg: '#f6f6f6' });
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '期間', { font: font, size: 9, align: 'center', bg: '#f6f6f6' });
      setCell_(r.getCell(1), p.period, { font: font, size: 9 });
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '役割・規模', { font: font, size: 9, align: 'center', bg: '#f6f6f6' });
      setCell_(r.getCell(1), p.role.length ? p.role : [''], { font: font, size: 9 });
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '概要', { font: font, size: 9, align: 'center', bg: '#f6f6f6', valign: 'top' });
      setCell_(r.getCell(1), p.overview.length ? p.overview : [''], { font: font, size: 9, valign: 'top' });
    });
    addPara_(body, '', { size: 6 });
  });

  // ■表彰・登壇実績
  if (d.achievementGroups.length) {
    addSectionHeading_(body, '表彰・登壇実績', font);
    d.achievementGroups.forEach(function (g) {
      addPara_(body, '＜' + g.title + '＞', { font: font, size: 10, bold: true, before: 2 });
      g.items.forEach(function (it) { addPara_(body, '・' + it, base); });
    });
  }

  // ■語学・資格情報
  if (d.licenseGroups.length) {
    addSectionHeading_(body, '語学・資格情報', font);
    d.licenseGroups.forEach(function (g) {
      addPara_(body, '＜' + g.title + '＞', { font: font, size: 10, bold: true, before: 2 });
      g.items.forEach(function (it) { addPara_(body, '・' + it, base); });
    });
  }

  // ■自己PR
  if (d.pr.length) {
    addSectionHeading_(body, '自己PR', font);
    d.pr.forEach(function (l) { addPara_(body, l, base); });
  }

  addPara_(body, '以上', { font: font, size: 10, align: 'right', before: 14 });

  var folder = getOutputFolder_(ss, model.settings);
  return finalizeDoc_(doc, folder, model.settings);
}


// ===== 70_AiReview.js =====
/**
 * AI 添削
 *  - プロンプト生成: 社内ルール＋入力内容をまとめたテキストを「AI添削」シートに出す（Gemini 等に貼って使う）
 *  - API 実行: ANTHROPIC_API_KEY（ユーザープロパティ）があれば Claude API を直接呼ぶ
 */


function buildReviewPrompt_(model) {
  var b = model.basic;
  var L = [];
  L.push('あなたは転職エージェントのキャリアアドバイザー兼、コンサルティングファームの採用担当です。以下の履歴書・職務経歴書の入力内容を添削してください。');
  L.push('');
  L = L.concat(KL.REVIEW_RULES);
  L.push('');
  L.push('# 入力内容');
  L.push('作成日: ' + formatJaDate_(model.asOf) + (model.age !== null ? '（満' + model.age + '歳）' : ''));
  L.push('');
  L.push('## 学歴');
  model.education.forEach(function (e) { L.push('- ' + formatYm_(e.year, e.month, '?') + ' ' + e.school + ' ' + e.kind); });
  L.push('');
  L.push('## 職歴');
  sortOldestFirst_(model.jobs).forEach(function (j) {
    L.push('- ' + formatPeriod_(j.startY, j.startM, j.endY, j.endM) + ' ' + j.company + '（' + (j.employment || '雇用形態未記入') + (j.position ? ' / ' + j.position : '') + '）');
  });
  L.push('');
  L.push('## 職務要約');
  L.push(model.texts.summary || '（未入力）');
  L.push('');
  L.push('## 活かせる経験・能力');
  model.skills.forEach(function (s) {
    L.push('### ' + s.title);
    skillBodyLines_(s).forEach(function (x) { L.push(x); });
  });
  L.push('');
  L.push('## プロジェクト詳細');
  sortNewestFirst_(model.projects).forEach(function (p) {
    L.push('### ' + p.name + '（' + p.company + ' / ' + formatPeriod_(p.startY, p.startM, p.endY, p.endM) + '）');
    if (p.role) L.push('役割・規模: ' + p.role);
    if (p.overview) L.push('概要: ' + p.overview);
    p.tasks.forEach(function (tk) { L.push('- ' + tk); });
    if (p.results) L.push('成果: ' + p.results);
  });
  L.push('');
  L.push('## 実績');
  model.achievements.forEach(function (a) { L.push('- [' + a.kind + '] ' + a.text); });
  L.push('');
  L.push('## 免許・資格');
  model.licenses.forEach(function (l) { L.push('- ' + l.name + (l.year !== null ? '（' + formatYm_(l.year, l.month) + '）' : '')); });
  L.push('');
  L.push('## 志望の動機・アピールポイント（履歴書）');
  L.push(nz_(b['志望の動機・特技・アピールポイント']) || '（未入力）');
  L.push('');
  L.push('## 自己PR（職務経歴書）');
  L.push(model.texts.pr || '（未入力）');
  L.push('');
  L.push('## 本人希望記入欄');
  L.push(nz_(b['本人希望記入欄']) || '（未入力）');
  return L.join('\n');
}

/** Claude API を呼び出して添削テキストを返す */
function callClaudeReview_(prompt, settings) {
  var key = PropertiesService.getUserProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('API キーが未設定です。メニュー「APIキーを設定」から登録してください。');
  var model = nz_(settings['AIモデル']) || 'claude-opus-5';
  var effort = nz_(settings['AI思考の深さ']) || 'medium';
  if (['low', 'medium', 'high'].indexOf(effort) < 0) effort = 'medium';

  var payload = {
    model: model,
    max_tokens: 6000,
    fallbacks: 'default',
    output_config: { effort: effort },
    system: 'あなたは日本の転職市場に精通したキャリアアドバイザーです。指示された形式で、具体的な修正文例を含めて日本語で回答してください。',
    messages: [{ role: 'user', content: prompt }]
  };
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code !== 200) {
    var msg = text;
    try { msg = JSON.parse(text).error.message; } catch (e) { /* keep raw */ }
    throw new Error('Claude API エラー (' + code + '): ' + msg);
  }
  var json = JSON.parse(text);
  if (json.stop_reason === 'refusal') {
    var why = json.stop_details && json.stop_details.explanation ? json.stop_details.explanation : '';
    throw new Error('AI が回答を控えました。' + why);
  }
  var out = [];
  (json.content || []).forEach(function (blk) { if (blk.type === 'text') out.push(blk.text); });
  if (json.stop_reason === 'max_tokens') out.push('\n（注: 出力が上限に達したため途中で切れています）');
  return out.join('\n');
}

/** 「AI添削」シートにプロンプト／結果を書き出す */
function writeAiSheet_(ss, prompt, result) {
  var sh = ss.getSheetByName(KL.SHEET.AI) || ss.insertSheet(KL.SHEET.AI);
  sh.clear();
  sh.getRange(1, 1, 1, 2).setValues([['添削プロンプト（Gemini / Claude にそのまま貼り付け）', '添削結果']]).setFontWeight('bold');
  sh.getRange(2, 1).setValue(prompt);
  sh.getRange(2, 2).setValue(result || '（未実行）');
  sh.setColumnWidth(1, 600).setColumnWidth(2, 600);
  sh.getRange(2, 1, 1, 2).setWrap(true).setVerticalAlignment('top');
  sh.setFrozenRows(1);
  return sh;
}


// ===== 80_Setup.js =====
/**
 * 初期セットアップ: 必要なシートを作り、見出し・入力ガイド・プルダウン・サンプル行を入れる。
 * 既存のシートは壊さない（見出しとメモだけ上書き。データ行は触らない）。
 */

function setupSheets_(ss, withSample) {
  var order = [KL.SHEET.BASIC, KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS,
    KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS, KL.SHEET.TEXTS, KL.SHEET.SETTINGS];

  setupKeyValueSheet_(ss, KL.SHEET.BASIC, KL.BASIC_KEYS, withSample ? sampleBasic_() : null);
  setupKeyValueSheet_(ss, KL.SHEET.TEXTS, KL.TEXT_KEYS, withSample ? sampleTexts_() : null);
  setupKeyValueSheet_(ss, KL.SHEET.SETTINGS, KL.SETTING_KEYS, null);

  var samples = withSample ? sampleTables_() : {};
  [KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS, KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS]
    .forEach(function (name) { setupTableSheet_(ss, name, samples[name]); });

  // シート順を整える
  order.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  });
  // 初期状態の「シート1」が空なら削除
  var def = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  ss.setActiveSheet(ss.getSheetByName(KL.SHEET.BASIC));
}

function setupKeyValueSheet_(ss, name, keys, sampleMap) {
  var sh = ss.getSheetByName(name);
  var isNew = !sh;
  if (isNew) sh = ss.insertSheet(name);
  sh.getRange('A:C').setNumberFormat('@');
  sh.getRange(1, 1, 1, 3).setValues([['項目', '値', '説明']]).setFontWeight('bold').setBackground('#e8eaed');
  var existing = {};
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) existing[nz_(rows[i][0])] = i + 1;
  keys.forEach(function (k) {
    var r = existing[k[0]];
    if (!r) {
      r = sh.getLastRow() + 1;
      sh.getRange(r, 1).setValue(k[0]);
      var v = sampleMap && sampleMap[k[0]] !== undefined ? sampleMap[k[0]] : k[1];
      sh.getRange(r, 2).setValue(v);
    } else if (sampleMap && nz_(sh.getRange(r, 2).getValue()) === '' && sampleMap[k[0]] !== undefined) {
      sh.getRange(r, 2).setValue(sampleMap[k[0]]);
    }
    sh.getRange(r, 3).setValue(k[2]).setFontColor('#666666');
  });
  sh.setColumnWidth(1, 220).setColumnWidth(2, 420).setColumnWidth(3, 420);
  sh.getRange('B:B').setWrap(true);
  sh.setFrozenRows(1);
}

function setupTableSheet_(ss, name, sampleRows) {
  var sh = ss.getSheetByName(name);
  var isNew = !sh;
  if (isNew) sh = ss.insertSheet(name);
  var headers = KL.HEADERS[name];
  sh.getRange('A:Z').setNumberFormat('@');
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8eaed');
  var notes = KL.HEADER_NOTES[name] || [];
  notes.forEach(function (n, i) { if (n) sh.getRange(1, i + 1).setNote(n); });
  var val = KL.VALIDATION[name];
  if (val) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(val.values, true).setAllowInvalid(true).build();
    sh.getRange(2, val.col, 500, 1).setDataValidation(rule);
  }
  if (sampleRows && sh.getLastRow() <= 1) {
    sh.getRange(2, 1, sampleRows.length, headers.length).setValues(sampleRows);
  }
  for (var c = 0; c < headers.length; c++) {
    var w = /(概要|支援内容|本文|事業内容|課題|工夫点|成果)/.test(headers[c]) ? 320 : /(名|見出し|会社|内容)/.test(headers[c]) ? 220 : 90;
    sh.setColumnWidth(c + 1, w);
  }
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), headers.length).setWrap(true).setVerticalAlignment('top');
  sh.setFrozenRows(1);
}

// ---- サンプルデータ（架空の人物。実データはここに入れないこと）
function sampleBasic_() {
  return {
    '氏名': '田中 太郎',
    'ふりがな': 'たなか たろう',
    '生年月日': '1997-05-10',
    '性別': '男',
    '郵便番号': '100-0001',
    '現住所': '東京都千代田区千代田1-1 サンプルマンション101',
    '現住所ふりがな': 'とうきょうとちよだくちよだ',
    '電話': '',
    '携帯': '080-0000-0000',
    'メール': 'taro.tanaka@example.com',
    '連絡先': '',
    '連絡先ふりがな': '',
    '作成日': '',
    '通勤時間': '約 45 分',
    '扶養家族数': '0',
    '配偶者': '無',
    '配偶者の扶養義務': '無',
    '志望の動機・特技・アピールポイント': '医療現場で業務改善とAI活用を主導し、調剤待ち時間を60%削減した経験を、貴社のクライアント企業のDX推進に活かしたいと考え志望いたしました。現場の暗黙知を言語化し、標準化して定着させることを得意としています。',
    '本人希望記入欄': '貴社の規定に従います。'
  };
}

function sampleTexts_() {
  return {
    '職務要約': 'サンプル大学薬学部を卒業後、株式会社サンプルドラッグにてOTC医薬品販売に従事し、現職の株式会社サンプル薬局に入社。薬剤師として調剤・服薬指導・在宅対応に従事する傍ら、業務改善・DX推進担当として業務設計の見直しを主導。\n調剤待ち時間を平均20分から8分（60%削減）に短縮し、紙カレンダー4種で運用していたタスク管理をGoogleカレンダーに一元化した。2025年9月以降は複数店舗（4店舗）を横断して社内AI活用の企画・講座運営を担当している。',
    '自己PR': '貴社のクライアント企業に対し、「現場の業務構造を可視化し、標準化して定着させる」ことで貢献できます。\n現職では、待ち時間の長さの原因を業務量ではなく現場の優先順位判断のばらつきにあると仮説を立て、業務を週・日単位に分解して「今やらなくてよい業務」を明示しました。その結果、スタッフが迷わず動ける状態を作り、待ち時間を60%削減しました。\nまた、AI活用ではツール導入を目的とせず、情報整理と候補提示をAI、最終判断を人が担う形で業務を再設計し、4店舗で講座を定期開催して定着まで伴走しました。\n現場と経営の双方の視点を持ち、仮説→実行→検証を回し切る姿勢で、入社後も早期に成果を出します。'
  };
}

function sampleTables_() {
  var s = {};
  s[KL.SHEET.EDUCATION] = [
    ['2016', '3', 'サンプル高等学校 普通科', '卒業'],
    ['2017', '4', 'サンプル大学 薬学部 薬学科', '入学'],
    ['2023', '3', 'サンプル大学 薬学部 薬学科', '卒業']
  ];
  s[KL.SHEET.JOBS] = [
    ['2023', '4', '2023', '6', '株式会社サンプルドラッグ', '正社員', 'OTC部門 薬剤師', '一身上の都合により退社',
      'ドラッグストアチェーン経営、調剤薬局経営', '39億円', '8,018億円（2025年3月時点）', '東証プライム市場', '8,166名（2025年3月末）'],
    ['2023', '7', '', '', '株式会社サンプル薬局', '正社員', '調剤薬局／業務改善・DX推進担当', '',
      '保険調剤、一般用医薬品の販売、在宅医療', '300万円（2015年12月時点）', '4億1,090万円（2025年9月時点）', '未上場', '31人']
  ];
  s[KL.SHEET.PROJECTS] = [
    ['株式会社サンプル薬局', '社内AI推進・業務改善プロジェクト', '2025', '9', '', '',
      '業務改善・AI活用企画担当\n複数店舗（4店舗）を対象に横断的に関与',
      '調剤薬局において在庫管理・発注・事務業務の意思決定が特定の担当者の経験に依存し、判断スピードと再現性にばらつきが生じていた。業務構造の整理・標準化を目的に、AI活用を含む業務再設計を担当。',
      '在庫管理・発注業務を棚卸しし、通常フローと例外フロー（出荷調整・欠品時）を整理\n管理薬剤師の経験に依存していた判断分岐を言語化し、判断前提を可視化\nAIを情報整理・候補提示に活かし、人が最終判断を行う業務フローを設計\n社内AI講座を月1回企画・実施し、各店舗特性に応じた活用方法へ調整',
      '調剤待ち時間 平均20分→8分（60%削減）\n4店舗でAI活用講座を定着（月1回・計8回）'],
    ['株式会社サンプル薬局', '調剤業務・タスク管理の標準化', '2023', '7', '2025', '8',
      '薬剤師（店舗配属）、業務改善担当',
      '4種類の紙カレンダーで運用していたタスク管理により、カレンダー選定と優先順位判断が手間となり業務効率が低下していた。',
      'GoogleカレンダーとTODOへの一元化を提案・移行\n定期タスクの自動化と重複リスクの解消\n患者応対を最優先とするルールを明文化',
      'タスク管理の一元化により確認工数を削減、記載漏れゼロ'],
    ['株式会社サンプルドラッグ', 'OTC医薬品販売・店舗運営', '2023', '4', '2023', '6',
      'OTC部門 薬剤師 店舗配属',
      'OTC医薬品の接客・販売および店舗運営業務を担当。',
      'OTC医薬品の接客・販売\nレジ業務、品出し、売場管理\n店舗運営補助業務',
      '']
  ];
  s[KL.SHEET.SKILLS] = [
    ['課題解決力', '',
      '店舗の業務改善担当として、患者応対の質を落とさずに待ち時間を短縮する',
      '調剤待ち時間を平均20分から10分以下へ（患者アンケートで不満の最多要因が待ち時間だったため）',
      '業務量ではなく、現場での優先順位判断のばらつきが原因だった',
      '予製（事前調剤）は手隙時間のみとし患者来院時は調剤を最優先とルール化。業務を週・日単位に分解して「今やらなくてよい業務」を明示',
      '待ち時間 平均20分→8分（60%削減）。現場の判断ミス・混乱も減少'],
    ['業務改善力',
      '株式会社サンプル薬局にて、タスク管理の一元化を主導した。従来は予製・外来予定・在宅訪問・その他の4種類の紙カレンダーを使い分け、タスク発生の度に該当カレンダーを探して記入していたため、選定と優先順位判断が手間になっていた。\nGoogleカレンダーとTODOへ移行し、①カレンダー選定の手間を排除、②情報を一元管理、③時間軸で管理、④重複リスクを解消、⑤定期タスクを自動化した。結果としてタスク確認の工数を削減し、記載漏れをゼロにした。',
      '', '', '', '', '']
  ];
  s[KL.SHEET.LICENSES] = [
    ['2016', '10', '普通自動車第一種運転免許', '免許・資格', '○'],
    ['2023', '3', '薬剤師免許', '免許・資格', '○'],
    ['2024', '7', '一級小型船舶操縦士', '免許・資格', '○'],
    ['', '', 'Google Workspace（Apps Script による業務自動化）', 'ツール・技術', ''],
    ['', '', 'Claude / Gemini を用いた業務設計・プロンプト設計', 'ツール・技術', '']
  ];
  s[KL.SHEET.ACHIEVEMENTS] = [
    ['登壇', '社内向けAI活用講座にて講師として登壇（月1回の定期講座、計8回）'],
    ['登壇', 'コミュニティ「AI木曜会」にて医療現場におけるAI活用をテーマに登壇']
  ];
  return s;
}


// ===== 90_Menu.js =====
/**
 * メニューとエントリポイント。ここから各モジュールを呼ぶ。
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu(KL.MENU_TITLE)
    .addItem('① 初期セットアップ（シート作成・サンプル投入）', 'menuSetupWithSample')
    .addItem('　 初期セットアップ（サンプルなし）', 'menuSetupEmpty')
    .addSeparator()
    .addItem('② 入力チェック', 'menuCheck')
    .addSeparator()
    .addItem('③ 履歴書を生成', 'menuBuildRirekisho')
    .addItem('③ 職務経歴書を生成', 'menuBuildShokumu')
    .addItem('③ 両方を生成', 'menuBuildBoth')
    .addSeparator()
    .addItem('④ AI添削プロンプトを作成（Gemini 等に貼る）', 'menuAiPrompt')
    .addItem('④ AI添削を実行（Claude API）', 'menuAiReview')
    .addItem('　 Claude APIキーを設定', 'menuSetApiKey')
    .addSeparator()
    .addItem('使い方', 'menuHelp')
    .addToUi();
}

function menuSetupWithSample() { setupAndNotify_(true); }
function menuSetupEmpty() { setupAndNotify_(false); }

function setupAndNotify_(withSample) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets_(ss, withSample);
  SpreadsheetApp.getUi().alert('セットアップ完了',
    'シートを作成しました。\n\n' +
    '1. 「基本情報」「学歴」「職歴」…を上から順に入力\n' +
    '2. 「② 入力チェック」でエラーを潰す\n' +
    '3. 「③ 両方を生成」で Google ドキュメント／PDF を出力\n\n' +
    (withSample ? '※ サンプルは架空の人物です。自分のデータに書き換えてください。' : ''),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var results = runChecks(model);
  writeCheckSheet_(ss, results);
  var c = summarizeChecks_(results);
  SpreadsheetApp.getUi().alert('入力チェック結果',
    'エラー: ' + c.ERROR + ' 件\n注意: ' + c.WARN + ' 件\n参考: ' + c.INFO + ' 件\n\n' +
    (c.ERROR ? 'エラーがあると生成結果に空欄や不整合が出ます。「チェック結果」シートを確認してください。' : 'エラーはありません。生成に進めます。'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function writeCheckSheet_(ss, results) {
  var sh = ss.getSheetByName(KL.SHEET.CHECK) || ss.insertSheet(KL.SHEET.CHECK);
  sh.clear();
  var rows = [['レベル', 'シート', '対象', '内容']];
  var order = { ERROR: 0, WARN: 1, INFO: 2 };
  results.slice().sort(function (a, b) { return order[a.level] - order[b.level]; })
    .forEach(function (r) { rows.push([r.level, r.where, r.item, r.message]); });
  if (rows.length === 1) rows.push(['OK', '-', '-', '指摘事項はありません。']);
  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e8eaed');
  for (var i = 1; i < rows.length; i++) {
    var color = rows[i][0] === 'ERROR' ? '#fce8e6' : rows[i][0] === 'WARN' ? '#fff4e5' : '#ffffff';
    sh.getRange(i + 1, 1, 1, 4).setBackground(color);
  }
  sh.setColumnWidth(1, 70).setColumnWidth(2, 110).setColumnWidth(3, 200).setColumnWidth(4, 600);
  sh.getRange(1, 4, rows.length, 1).setWrap(true);
  sh.setFrozenRows(1);
  ss.setActiveSheet(sh);
}

function guardErrors_(ss, model) {
  var results = runChecks(model);
  var c = summarizeChecks_(results);
  if (c.ERROR > 0) {
    writeCheckSheet_(ss, results);
    var ui = SpreadsheetApp.getUi();
    var ans = ui.alert('エラーがあります',
      'エラー ' + c.ERROR + ' 件。「チェック結果」シートを確認してください。\nこのまま生成しますか？（空欄や不整合のまま出力されます）',
      ui.ButtonSet.YES_NO);
    return ans === ui.Button.YES;
  }
  return true;
}

function menuBuildRirekisho() { buildAndNotify_(true, false); }
function menuBuildShokumu() { buildAndNotify_(false, true); }
function menuBuildBoth() { buildAndNotify_(true, true); }

function buildAndNotify_(doRireki, doShokumu) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  if (!guardErrors_(ss, model)) return;
  var msg = [];
  if (doRireki) {
    var r = buildRirekishoDoc_(model, ss);
    msg.push('履歴書:\n' + r.docUrl + (r.pdfUrl ? '\nPDF: ' + r.pdfUrl : ''));
  }
  if (doShokumu) {
    var s = buildShokumuDoc_(model, ss);
    msg.push('職務経歴書:\n' + s.docUrl + (s.pdfUrl ? '\nPDF: ' + s.pdfUrl : ''));
  }
  var folder = getOutputFolder_(ss, model.settings);
  msg.push('出力先フォルダ:\n' + folder.getUrl());
  SpreadsheetApp.getUi().alert('生成完了', msg.join('\n\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiPrompt() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var prompt = buildReviewPrompt_(model);
  var sh = writeAiSheet_(ss, prompt, '');
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('プロンプトを作成しました',
    '「AI添削」シートの A2 セルをコピーして、Gemini（Workspace）や Claude に貼り付けてください。\n' +
    '社内ルール（西暦統一・雇用形態・空白期間・一貫性・再現性）を含んだ添削指示になっています。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiReview() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var prompt = buildReviewPrompt_(model);
  var ui = SpreadsheetApp.getUi();
  try {
    var result = callClaudeReview_(prompt, model.settings);
    var sh = writeAiSheet_(ss, prompt, result);
    ss.setActiveSheet(sh);
    ui.alert('AI添削 完了', '「AI添削」シートの B2 セルに結果を書き出しました。', ui.ButtonSet.OK);
  } catch (e) {
    writeAiSheet_(ss, prompt, '');
    ui.alert('AI添削 失敗', String(e.message || e) + '\n\n外部APIが使えない環境では「AI添削プロンプトを作成」を使い、Gemini に貼り付けてください。', ui.ButtonSet.OK);
  }
}

function menuSetApiKey() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Claude APIキーを設定',
    'sk-ant- で始まるキーを貼り付けてください（このアカウントのユーザープロパティに保存され、他の共有者には見えません）。\n空欄で OK を押すと削除します。',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = nz_(res.getResponseText());
  var props = PropertiesService.getUserProperties();
  if (key) { props.setProperty('ANTHROPIC_API_KEY', key); ui.alert('保存しました。'); }
  else { props.deleteProperty('ANTHROPIC_API_KEY'); ui.alert('削除しました。'); }
}

function menuHelp() {
  SpreadsheetApp.getUi().alert('使い方 (v' + KL.VERSION + ')',
    '【流れ】\n' +
    '① 初期セットアップ → ② 各シートに入力 → ② 入力チェック → ③ 生成 → ④ AI添削 → 直して再生成\n\n' +
    '【シート】\n' +
    '基本情報: 履歴書の氏名・住所など\n' +
    '学歴 / 職歴: 履歴書と職務経歴書の両方に使う。年は西暦4桁\n' +
    'プロジェクト: 職務経歴書の詳細。会社名は職歴と完全一致\n' +
    '経験・能力: 本文を書くか、5要素（ミッション→目標数字→課題→工夫点→結果）を埋める\n' +
    '免許・資格: 「履歴書に載せる」に ○ で履歴書にも出す\n' +
    '文章: 職務要約・自己PR\n' +
    '設定: 出力先・フォント・PDF・AIモデル\n\n' +
    '【出力】\n' +
    'Google ドキュメント（編集可）と PDF を出力フォルダに保存します。写真は「写真ファイルID」を入れると自動挿入、無ければ枠のみ。\n\n' +
    '【注意】\n' +
    'このスプレッドシートには個人情報が入ります。共有設定に注意し、GitHub 等に実データを置かないでください。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
