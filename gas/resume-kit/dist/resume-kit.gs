/*
 * Kantetsu Lab 履歴書・職務経歴書ジェネレーター（Google Apps Script）
 * このファイルは gas/resume-kit/src/*.js から自動生成されています。直接編集せず src を直して `node gas/resume-kit/bundle.mjs` を実行してください。
 * generated: 2026-09-23T01:00:31.755Z
 */
// ===== 00_Config.js =====
/**
 * Kantetsu Lab 履歴書・職務経歴書ジェネレーター
 * 設定と定数。シート名・列定義はここだけを見れば分かるようにする。
 */

var KL = KL || {};

KL.VERSION = '1.1.0';
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
  ['出力フォルダ', '', '保存先フォルダの URL / ID / 名前。空欄なら生成時に毎回選択（前回の選択を記憶）'],
  ['ファイル名パターン', '{氏名}様_{種別}', '使えるトークン: {氏名} {種別} {日付}  例: {氏名}様_{種別} → 田中 太郎様_履歴書'],
  ['履歴書テンプレート', '', '会社規定の用紙を使う場合、Google ドキュメント / スプレッドシート / Word / Excel の URL か ID。空欄なら標準レイアウト'],
  ['職務経歴書テンプレート', '', '同上'],
  ['履歴書フォント', 'Noto Serif JP', '標準レイアウトで使うフォント名'],
  ['職務経歴書フォント', 'Noto Sans JP', ''],
  ['PDFも出力', 'はい', 'はい / いいえ'],
  ['AIプロバイダ', 'gemini', 'gemini / claude'],
  ['Geminiモデル', 'gemini-2.5-pro', 'Gemini API のモデル名'],
  ['Claudeモデル', 'claude-opus-5', 'Claude API のモデルID'],
  ['AI思考の深さ', 'medium', 'Claude 用: low / medium / high（高いほど時間がかかる。GAS の通信制限内に収めるなら medium 推奨）']
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

// v1.0 の設定名 → 新しい設定名（値の引き継ぎ用）
KL.LEGACY_SETTINGS = { '出力フォルダ': '出力フォルダID', 'Claudeモデル': 'AIモデル' };

// ---- テンプレート（会社規定の用紙）用トークン
// 単一値トークン: {{氏名}} のように用紙に書いておくと置換される
KL.TOKENS_SINGLE = [
  ['氏名', '氏名'], ['ふりがな', 'ふりがな（氏名）'], ['生年月日', '1997年5月10日 の形式'], ['生年月日_年', ''], ['生年月日_月', ''], ['生年月日_日', ''],
  ['年齢', '満年齢（数字のみ）'], ['性別', ''], ['郵便番号', ''], ['現住所', ''], ['現住所ふりがな', ''], ['電話', ''], ['携帯', ''], ['メール', ''],
  ['連絡先', '未入力なら「同上」'], ['連絡先ふりがな', ''], ['作成日', '2026年9月13日 の形式'], ['作成日_年', ''], ['作成日_月', ''], ['作成日_日', ''],
  ['通勤時間', ''], ['扶養家族数', ''], ['配偶者', ''], ['配偶者の扶養義務', ''], ['志望動機', '志望の動機・特技・アピールポイント'], ['本人希望', '本人希望記入欄'],
  ['写真', 'ドキュメントのみ: 写真ファイルIDの画像を挿入'],
  ['職務要約', ''], ['自己PR', ''], ['経験能力', '活かせる経験・能力（複数段落）'], ['職務経歴詳細', '会社・プロジェクト詳細をテキストで'],
  ['実績', '表彰・登壇（1行1件）'], ['資格一覧', '免許・資格（1行1件）']
];
// 行リストトークン: 用紙の 1 行（ドキュメントは表の行、スプレッドシートは開始行）に置くと、行数分展開される
KL.TOKENS_LIST = {
  '学歴職歴': { cols: ['年', '月', '内容'], note: '学歴と職歴を 1 つの表に（履歴書標準）' },
  '学歴': { cols: ['年', '月', '内容'], note: '学歴のみ' },
  '職歴': { cols: ['年', '月', '内容'], note: '職歴のみ' },
  '資格': { cols: ['年', '月', '内容'], note: '免許・資格（履歴書に載せる○のみ）' },
  '所属企業': { cols: ['期間', '会社名', '雇用形態'], note: '職務経歴書の所属企業一覧' }
};
// 用紙のラベル → トークン（トークン自動挿入の手掛かり）。前方一致・空白無視
KL.LABEL_TO_TOKEN = [
  ['氏名', '{{氏名}}'], ['作成日', '{{作成日}}'], ['ふりがな', '{{ふりがな}}'], ['フリガナ', '{{ふりがな}}'], ['生年月日', '{{生年月日}}'], ['性別', '{{性別}}'],
  ['現住所', '{{現住所}}'], ['住所', '{{現住所}}'], ['電話', '{{電話}}'], ['TEL', '{{電話}}'], ['携帯', '{{携帯}}'], ['メール', '{{メール}}'], ['E-mail', '{{メール}}'], ['Email', '{{メール}}'],
  ['連絡先', '{{連絡先}}'], ['通勤時間', '{{通勤時間}}'], ['扶養家族', '{{扶養家族数}}'], ['配偶者の扶養義務', '{{配偶者の扶養義務}}'], ['配偶者', '{{配偶者}}'],
  ['志望の動機', '{{志望動機}}'], ['志望動機', '{{志望動機}}'], ['本人希望', '{{本人希望}}'], ['職務要約', '{{職務要約}}'], ['職務概要', '{{職務要約}}'], ['自己PR', '{{自己PR}}'],
  ['活かせる経験', '{{経験能力}}'], ['職務経歴', '{{職務経歴詳細}}'], ['免許・資格', '{{資格_内容}}'], ['資格', '{{資格_内容}}'], ['学歴・職歴', '{{学歴職歴_内容}}'], ['学歴', '{{学歴_内容}}'], ['職歴', '{{職歴_内容}}']
];

// AI の system プロンプト
KL.AI_SYSTEM = 'あなたは日本の転職市場に精通したキャリアアドバイザーです。事実（社名・年月・数値）を創作せず、指示された形式で日本語で回答してください。';


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

  // v1.0 の設定名からの引き継ぎ（セットアップ未実行でも動くように）
  var legacy = KL.LEGACY_SETTINGS;
  var settings = {};
  KL.SETTING_KEYS.forEach(function (k) {
    settings[k[0]] = nz_(settingsRaw[k[0]]) || nz_(settingsRaw[legacy[k[0]]]) || k[1];
  });
  if (nz_(settingsRaw['ファイル名の接頭辞']) && !nz_(settingsRaw['ファイル名パターン'])) {
    settings['ファイル名パターン'] = nz_(settingsRaw['ファイル名の接頭辞']) + settings['ファイル名パターン'];
  }

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

  // ---- 設定
  var st = model.settings || {};
  ['履歴書テンプレート', '職務経歴書テンプレート'].forEach(function (k) {
    if (nz_(st[k]) && !extractDriveId_(st[k])) add('ERROR', KL.SHEET.SETTINGS, k, 'URL か ID として読めません。');
  });
  if (nz_(st['AIプロバイダ']) && !/^(gemini|claude)$/i.test(nz_(st['AIプロバイダ']))) add('WARN', KL.SHEET.SETTINGS, 'AIプロバイダ', 'gemini か claude を指定してください。');
  if (nz_(st['ファイル名パターン']) && st['ファイル名パターン'].indexOf('{種別}') < 0) add('INFO', KL.SHEET.SETTINGS, 'ファイル名パターン', '{種別} が無いため末尾に自動で付けます（履歴書と職務経歴書が同名になるのを防ぐため）。');

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


// ===== 45_Template.js =====
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
  var essential = ['氏名', '生年月日', '現住所'];
  var missing = essential.filter(function (e) { return !found[e] && !found[e + '_年']; });
  if (!Object.keys(found).some(function (t) { return /^(学歴職歴|学歴|職歴)_/.test(t); }) && !found['職務経歴詳細']) missing.push('学歴職歴_内容（または 学歴_内容 / 職歴_内容 / 職務経歴詳細）');
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
  return ['{{志望動機}}', '{{本人希望}}', '{{職務要約}}', '{{自己PR}}', '{{経験能力}}', '{{職務経歴詳細}}'].indexOf(t) >= 0;
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

function buildRirekishoDoc_(model, ss, folder) {
  if (nz_(model.settings['履歴書テンプレート'])) return buildFromTemplate_(model, '履歴書', folder);
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

  // 結合セルを使わず、列構成ごとの表を縦に積む（DocumentApp はセル結合を正式に扱えないため）
  var W = KL.CONTENT_W - photoW - 6;
  var r;
  // 氏名
  var ta = newTable_(left, 2, 2, [52, W - 52], 0.75);
  r = ta.getRow(0); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(r.getCell(1), d.kana, { font: font, size: 9 });
  r = ta.getRow(1); rowHeight_(r, 34);
  setCell_(r.getCell(0), '氏　名', label);
  setCell_(r.getCell(1), d.name, { font: font, size: 16 });
  // 生年月日 / 性別
  var tb = newStackedTable_(left, 1, 2, [Math.round(W * 0.66), W - Math.round(W * 0.66)], 0.75);
  r = tb.getRow(0); rowHeight_(r, 20);
  setCell_(r.getCell(0), d.birthLine, { font: font, size: 10, align: 'center' });
  setCell_(r.getCell(1), '※性別　' + d.sex, { font: font, size: 9, align: 'center' });
  // 現住所 / 電話・携帯
  var telW = 96;
  var tc = newStackedTable_(left, 2, 4, [52, W - 52 - 40 - telW, 40, telW], 0.75);
  r = tc.getRow(0); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(r.getCell(1), d.addrKana, { font: font, size: 8 });
  setCell_(r.getCell(2), '電話', label);
  setCell_(r.getCell(3), d.tel, { font: font, size: 9 });
  r = tc.getRow(1); rowHeight_(r, 40);
  setCell_(r.getCell(0), '現住所', label);
  setCell_(r.getCell(1), ['〒 ' + d.postal, d.address], { font: font, size: 10 });
  setCell_(r.getCell(2), '携帯', label);
  setCell_(r.getCell(3), d.mobile, { font: font, size: 9 });
  // メール / 連絡先
  var td = newStackedTable_(left, 3, 2, [52, W - 52], 0.75);
  r = td.getRow(0); rowHeight_(r, 18);
  setCell_(r.getCell(0), 'E-mail', label);
  setCell_(r.getCell(1), d.email, { font: font, size: 10 });
  r = td.getRow(1); rowHeight_(r, 16);
  setCell_(r.getCell(0), 'ふりがな', label);
  setCell_(r.getCell(1), d.contactKana, { font: font, size: 8 });
  r = td.getRow(2); rowHeight_(r, 36);
  setCell_(r.getCell(0), '連絡先', label);
  setCell_(r.getCell(1), ['〒 （現住所以外に連絡を希望する場合のみ記入）', d.contact], { font: font, size: 9 });
  shrinkTrailingGap_(left);

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
      period: formatPeriod_(j.startY, j.startM, j.endY, j.endM),
      company: j.company,
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

function buildShokumuDoc_(model, ss, folder) {
  if (nz_(model.settings['職務経歴書テンプレート'])) return buildFromTemplate_(model, '職務経歴書', folder);
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
  var sub = { font: font, size: 9, align: 'center', bg: '#f6f6f6' };
  d.companies.forEach(function (c) {
    // 会社ごとに結合セルなしの 2 列表 1 つ: 在籍期間｜会社名 → 会社概要 → (案件｜期間｜役割・規模｜概要)×n
    var rowCount = 2 + (c.projects.length === 0 ? 1 : c.projects.length * 4);
    var t = newTable_(body, rowCount, 2, dw, 0.75);
    var idx = 0;
    var r = t.getRow(idx++);
    setCell_(r.getCell(0), c.period, { font: font, size: 9, bold: true, align: 'center', bg: '#e8e8e8' });
    setCell_(r.getCell(1), c.company, { font: font, size: 10, bold: true, bg: '#e8e8e8' });
    r = t.getRow(idx++);
    setCell_(r.getCell(0), '会社概要', sub);
    setCell_(r.getCell(1), c.info.length ? c.info : [''], { font: font, size: 8 });
    if (c.projects.length === 0) {
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '担当業務', sub);
      setCell_(r.getCell(1), c.position || '', { font: font, size: 9 });
    }
    c.projects.forEach(function (p) {
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '案件', { font: font, size: 9, bold: true, align: 'center', bg: '#eef2f7' });
      setCell_(r.getCell(1), p.name, { font: font, size: 10, bold: true, bg: '#eef2f7' });
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '期間', sub);
      setCell_(r.getCell(1), p.period, { font: font, size: 9 });
      r = t.getRow(idx++);
      setCell_(r.getCell(0), '役割・規模', sub);
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

  return finalizeDoc_(doc, folder, model.settings);
}


// ===== 70_AiReview.js =====
/**
 * AI 分析・添削（Gemini API / Claude API）
 *  - プロンプト生成: 社内ルール＋入力内容（セル番地付き）。Gemini（Workspace）にそのまま貼っても使える
 *  - API 実行: 総評 + 「項目ごとの修正提案」を JSON で受け取り、AI提案 シートに書く
 *  - 提案の反映: チェックを付けた行だけシートに書き戻す（事実の書き換えを AI に無断でさせない）
 */

/** 入力内容を「番地」付きで列挙する。番地は提案の反映先に使う */
function buildContentDump_(model) {
  var b = model.basic;
  var L = [];
  L.push('作成日: ' + formatJaDate_(model.asOf) + (model.age !== null ? '（満' + model.age + '歳）' : ''));
  L.push('');
  L.push('## 基本情報（番地: 基本情報!項目名）');
  ['志望の動機・特技・アピールポイント', '本人希望記入欄', 'メール', '現住所'].forEach(function (k) {
    L.push('[基本情報!' + k + '] ' + (nz_(b[k]) || '（未入力）'));
  });
  L.push('');
  L.push('## 学歴（番地: 学歴!行N!列名）');
  model.education.forEach(function (e) { L.push('[学歴!行' + e.row + '] ' + formatYm_(e.year, e.month, '?') + ' ' + e.school + ' ' + e.kind); });
  L.push('');
  L.push('## 職歴（番地: 職歴!行N!列名）');
  sortOldestFirst_(model.jobs).forEach(function (j) {
    L.push('[職歴!行' + j.row + '] ' + formatPeriod_(j.startY, j.startM, j.endY, j.endM) + ' ' + j.company + '（雇用形態: ' + (j.employment || '未記入') + ' / 部門・職位: ' + (j.position || '未記入') + '）');
  });
  L.push('');
  L.push('## 文章（番地: 文章!項目名）');
  L.push('[文章!職務要約] ' + (model.texts.summary || '（未入力）'));
  L.push('[文章!自己PR] ' + (model.texts.pr || '（未入力）'));
  L.push('');
  L.push('## 活かせる経験・能力（番地: 経験・能力!行N!本文 など。5要素は ミッション/目標数字/課題/工夫点/結果）');
  model.skills.forEach(function (s) {
    L.push('[経験・能力!行' + s.row + '!見出し] ' + s.title);
    if (s.body) L.push('[経験・能力!行' + s.row + '!本文] ' + s.body);
    else {
      L.push('[経験・能力!行' + s.row + '!ミッション] ' + s.mission);
      L.push('[経験・能力!行' + s.row + '!目標数字] ' + s.target);
      L.push('[経験・能力!行' + s.row + '!課題] ' + s.issue);
      L.push('[経験・能力!行' + s.row + '!工夫点] ' + s.ingenuity);
      L.push('[経験・能力!行' + s.row + '!結果] ' + s.result);
    }
  });
  L.push('');
  L.push('## プロジェクト（番地: プロジェクト!行N!列名。列名は プロジェクト名/役割・規模/プロジェクト概要/支援内容（1行1項目）/成果・実績）');
  sortNewestFirst_(model.projects).forEach(function (p) {
    L.push('[プロジェクト!行' + p.row + '!プロジェクト名] ' + p.name + '（' + p.company + ' / ' + formatPeriod_(p.startY, p.startM, p.endY, p.endM) + '）');
    L.push('[プロジェクト!行' + p.row + '!役割・規模] ' + p.role);
    L.push('[プロジェクト!行' + p.row + '!プロジェクト概要] ' + p.overview);
    L.push('[プロジェクト!行' + p.row + '!支援内容（1行1項目）] ' + p.tasks.join(' / '));
    L.push('[プロジェクト!行' + p.row + '!成果・実績] ' + p.results);
  });
  L.push('');
  L.push('## 実績（番地: 実績!行N!内容）');
  model.achievements.forEach(function (a) { L.push('[実績!行' + a.row + '!内容] [' + a.kind + '] ' + a.text); });
  L.push('');
  L.push('## 免許・資格');
  model.licenses.forEach(function (l) { L.push('[免許・資格!行' + l.row + '!名称] ' + l.name + (l.year !== null ? '（' + formatYm_(l.year, l.month) + '）' : '')); });
  return L.join('\n');
}

/** 人が貼って使うプロンプト（自由記述の添削） */
function buildReviewPrompt_(model) {
  var L = [];
  L.push('あなたは転職エージェントのキャリアアドバイザー兼、コンサルティングファームの採用担当です。以下の履歴書・職務経歴書の入力内容を添削してください。');
  L.push('');
  L = L.concat(KL.REVIEW_RULES);
  L.push('');
  L.push('# 入力内容');
  L.push(buildContentDump_(model));
  return L.join('\n');
}

/** API 用プロンプト（JSON で総評＋提案を返させる） */
function buildAnalysisPrompt_(model) {
  var L = [];
  L.push('以下の履歴書・職務経歴書の入力内容を分析し、JSON のみを返してください（前後に説明文やコードフェンスを付けない）。');
  L.push('');
  L = L.concat(KL.REVIEW_RULES.slice(0, KL.REVIEW_RULES.length - 1));
  L.push('');
  L.push('# 出力 JSON の形式');
  L.push('{');
  L.push('  "review": "総評（3〜6行）。次に、事実・整合性の重大な指摘、面接で突っ込まれそうな点を箇条書きで。Markdown 可",');
  L.push('  "proposals": [');
  L.push('    { "address": "文章!職務要約", "current": "現在の文の冒頭20字", "proposed": "修正後の全文", "reason": "なぜ良くなるか（1〜2文）", "priority": "高|中|低" }');
  L.push('  ]');
  L.push('}');
  L.push('- address は入力内容に付いている [番地] をそのまま使う（例: 文章!自己PR、経験・能力!行2!本文、プロジェクト!行3!プロジェクト概要）');
  L.push('- proposed はセルにそのまま貼れる完成文。改行は \\n。事実（社名・年月・数値）は入力に無いものを創作しない。数値が無い箇所は「【要確認: 〇〇の数値】」と穴を明示する');
  L.push('- 提案は多くても 8 件。優先度の高い順');
  L.push('');
  L.push('# 入力内容');
  L.push(buildContentDump_(model));
  return L.join('\n');
}

// ---------------- プロバイダ

function getApiKey_(provider) {
  var name = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
  return PropertiesService.getUserProperties().getProperty(name);
}

/** プロンプトを投げてテキストを返す */
function callAi_(prompt, settings, systemText) {
  var provider = (nz_(settings['AIプロバイダ']) || 'gemini').toLowerCase();
  if (provider === 'claude') return callClaude_(prompt, settings, systemText);
  return callGemini_(prompt, settings, systemText);
}

function callGemini_(prompt, settings, systemText) {
  var key = getApiKey_('gemini');
  if (!key) throw new Error('Gemini の API キーが未設定です。メニュー「APIキーを設定」から登録してください（Google AI Studio で発行）。');
  var model = nz_(settings['Geminiモデル']) || 'gemini-2.5-pro';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  var payload = {
    system_instruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
  };
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var code = res.getResponseCode(), text = res.getContentText();
  if (code !== 200) {
    var msg = text;
    try { msg = JSON.parse(text).error.message; } catch (e) { /* raw */ }
    throw new Error('Gemini API エラー (' + code + '): ' + msg);
  }
  var json = JSON.parse(text);
  var cand = (json.candidates || [])[0];
  if (!cand || !cand.content) throw new Error('Gemini から回答が得られませんでした' + (json.promptFeedback ? '（' + JSON.stringify(json.promptFeedback) + '）' : '') + '。');
  return (cand.content.parts || []).map(function (p) { return p.text || ''; }).join('');
}

function callClaude_(prompt, settings, systemText) {
  var key = getApiKey_('claude');
  if (!key) throw new Error('Claude の API キーが未設定です。メニュー「APIキーを設定」から登録してください。');
  var model = nz_(settings['Claudeモデル']) || 'claude-opus-5';
  var effort = nz_(settings['AI思考の深さ']) || 'medium';
  if (['low', 'medium', 'high'].indexOf(effort) < 0) effort = 'medium';
  var payload = {
    model: model,
    max_tokens: 8000,
    fallbacks: 'default',
    output_config: { effort: effort },
    system: systemText,
    messages: [{ role: 'user', content: prompt }]
  };
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var code = res.getResponseCode(), text = res.getContentText();
  if (code !== 200) {
    var msg = text;
    try { msg = JSON.parse(text).error.message; } catch (e) { /* raw */ }
    throw new Error('Claude API エラー (' + code + '): ' + msg);
  }
  var json = JSON.parse(text);
  if (json.stop_reason === 'refusal') {
    throw new Error('AI が回答を控えました。' + (json.stop_details && json.stop_details.explanation ? json.stop_details.explanation : ''));
  }
  var out = [];
  (json.content || []).forEach(function (blk) { if (blk.type === 'text') out.push(blk.text); });
  if (json.stop_reason === 'max_tokens') out.push('\n（注: 出力が上限に達したため途中で切れています）');
  return out.join('\n');
}

// ---------------- 提案の解析と反映（純粋関数はテスト対象）

/** AI の返答テキストから { review, proposals } を取り出す。コードフェンスや前置きに耐える */
function parseAnalysis_(text) {
  var s = nz_(text);
  var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1];
  var start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start < 0 || end < 0) return { review: nz_(text), proposals: [] };
  var obj;
  try { obj = JSON.parse(s.slice(start, end + 1)); } catch (e) { return { review: nz_(text), proposals: [] }; }
  var proposals = Array.isArray(obj.proposals) ? obj.proposals : [];
  return {
    review: nz_(obj.review),
    proposals: proposals.filter(function (p) { return p && nz_(p.address) && nz_(p.proposed); }).map(function (p) {
      return { address: nz_(p.address), current: nz_(p.current), proposed: nz_(p.proposed), reason: nz_(p.reason), priority: nz_(p.priority) || '中' };
    })
  };
}

/** 番地 "シート!行N!列名" / "シート!項目名" を分解 */
function parseAddress_(address) {
  var parts = nz_(address).split('!').map(function (x) { return x.trim(); });
  if (parts.length < 2) return null;
  var sheet = parts[0];
  // AI が書き換えてよいのは入力シートだけ（設定・チェック結果などは不可）
  var allowed = [KL.SHEET.BASIC, KL.SHEET.TEXTS, KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS,
    KL.SHEET.SKILLS, KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS];
  if (allowed.indexOf(sheet) < 0) return null;
  var isKv = (sheet === KL.SHEET.BASIC || sheet === KL.SHEET.TEXTS);
  if (isKv) return { sheet: sheet, key: parts[1] };
  var m = parts[1].match(/^行\s*(\d+)$/);
  if (!m) return null;
  var col = parts[2] || (sheet === KL.SHEET.ACHIEVEMENTS ? '内容' : sheet === KL.SHEET.SKILLS ? '本文' : '');
  if (!col) return null;
  return { sheet: sheet, row: parseInt(m[1], 10), col: col };
}

/** 番地の現在値を読む（反映前の確認用） */
function readAtAddress_(ss, addr) {
  var sh = ss.getSheetByName(addr.sheet);
  if (!sh) return null;
  if (addr.key) {
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) if (nz_(rows[i][0]) === addr.key) return { range: sh.getRange(i + 1, 2), value: nz_(rows[i][1]) };
    return null;
  }
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(nz_);
  var c = headers.indexOf(addr.col);
  if (c < 0) return null;
  var range = sh.getRange(addr.row, c + 1);
  return { range: range, value: nz_(range.getValue()) };
}

/** AI提案 シートに書く */
function writeProposalSheet_(ss, review, proposals) {
  var sh = ss.getSheetByName('AI提案') || ss.insertSheet('AI提案');
  sh.clear();
  sh.getRange(1, 1).setValue('総評').setFontWeight('bold');
  sh.getRange(1, 2).setValue(review || '（なし）').setWrap(true).setVerticalAlignment('top');
  var header = ['反映', '優先度', '番地', '現在の値', '提案', '理由', '状態'];
  sh.getRange(3, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#e8eaed');
  var rows = proposals.map(function (p) {
    var addr = parseAddress_(p.address);
    var cur = addr ? readAtAddress_(ss, addr) : null;
    return [false, p.priority, p.address, cur ? cur.value : '（番地が見つかりません）', p.proposed, p.reason, cur ? '未反映' : '反映不可'];
  });
  if (rows.length) {
    sh.getRange(4, 1, rows.length, header.length).setValues(rows);
    sh.getRange(4, 1, rows.length, 1).insertCheckboxes();
    sh.getRange(4, 4, rows.length, 3).setWrap(true).setVerticalAlignment('top');
  }
  sh.setColumnWidth(1, 50).setColumnWidth(2, 60).setColumnWidth(3, 200).setColumnWidth(4, 300).setColumnWidth(5, 400).setColumnWidth(6, 300).setColumnWidth(7, 80);
  sh.setFrozenRows(3);
  return sh;
}

/** チェックの付いた提案を各シートへ書き戻す。反映件数を返す */
function applyProposals_(ss) {
  var sh = ss.getSheetByName('AI提案');
  if (!sh || sh.getLastRow() < 4) return 0;
  var rows = sh.getRange(4, 1, sh.getLastRow() - 3, 7).getValues();
  var applied = 0;
  rows.forEach(function (r, i) {
    if (r[0] !== true || nz_(r[6]) === '反映済') return;
    var addr = parseAddress_(r[2]);
    var cur = addr ? readAtAddress_(ss, addr) : null;
    if (!cur) { sh.getRange(i + 4, 7).setValue('反映不可'); return; }
    cur.range.setValue(r[4]);
    sh.getRange(i + 4, 7).setValue('反映済');
    sh.getRange(i + 4, 1).setValue(false);
    applied++;
  });
  return applied;
}

/** 「AI添削」シートにプロンプト／結果を書き出す（貼り付け用） */
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
  var legacyValue = function (key) {
    if (name === KL.SHEET.SETTINGS && key === 'ファイル名パターン') {
      var pr = existing['ファイル名の接頭辞'] ? nz_(rows[existing['ファイル名の接頭辞'] - 1][1]) : '';
      return pr ? pr + '{氏名}様_{種別}' : '';
    }
    var old = name === KL.SHEET.SETTINGS ? KL.LEGACY_SETTINGS[key] : null;
    return old && existing[old] ? nz_(rows[existing[old] - 1][1]) : '';
  };
  keys.forEach(function (k) {
    var r = existing[k[0]];
    if (!r) {
      r = sh.getLastRow() + 1;
      sh.getRange(r, 1).setValue(k[0]);
      var v = sampleMap && sampleMap[k[0]] !== undefined ? sampleMap[k[0]] : (legacyValue(k[0]) || k[1]);
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
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(KL.MENU_TITLE)
    .addItem('① 初期セットアップ（シート作成・サンプル投入）', 'menuSetupWithSample')
    .addItem('　 初期セットアップ（サンプルなし）', 'menuSetupEmpty')
    .addSeparator()
    .addItem('② 入力チェック', 'menuCheck')
    .addSeparator()
    .addItem('③ 履歴書を生成', 'menuBuildRirekisho')
    .addItem('③ 職務経歴書を生成', 'menuBuildShokumu')
    .addItem('③ 両方を生成', 'menuBuildBoth')
    .addSeparator()
    .addSubMenu(ui.createMenu('④ AI 分析（Gemini / Claude）')
      .addItem('分析して提案を作る', 'menuAiAnalyze')
      .addItem('チェックした提案を反映', 'menuApplyProposals')
      .addItem('添削プロンプトだけ作る（Gemini に貼る）', 'menuAiPrompt')
      .addItem('APIキーを設定', 'menuSetApiKey'))
    .addSubMenu(ui.createMenu('⑤ 会社規定の用紙（テンプレート）')
      .addItem('テンプレートを診断', 'menuDiagnoseTemplate')
      .addItem('用紙にトークンを自動挿入（コピーを作成）', 'menuAutoInsertTokens')
      .addItem('トークン一覧を表示', 'menuTokenList'))
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
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  if (!guardErrors_(ss, model)) return;
  try {
    var folder = chooseOutputFolder_(ss, model.settings, ui);
    if (!folder) return;
    var msg = ['保存先: ' + folder.getName() + '\n' + folder.getUrl()];
    if (doRireki) {
      var r = buildRirekishoDoc_(model, ss, folder);
      msg.push('履歴書:\n' + r.docUrl + (r.pdfUrl ? '\nPDF: ' + r.pdfUrl : ''));
    }
    if (doShokumu) {
      var s = buildShokumuDoc_(model, ss, folder);
      msg.push('職務経歴書:\n' + s.docUrl + (s.pdfUrl ? '\nPDF: ' + s.pdfUrl : ''));
    }
    ui.alert('生成完了', msg.join('\n\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('生成できませんでした', String(e.message || e), ui.ButtonSet.OK);
  }
}

// ---------------- AI

function menuAiPrompt() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var model = loadModel(ss);
  var sh = writeAiSheet_(ss, buildReviewPrompt_(model), '');
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('プロンプトを作成しました',
    '「AI添削」シートの A2 セルをコピーして、Gemini（Workspace）や Claude に貼り付けてください。\n' +
    '社内ルール（西暦統一・雇用形態・空白期間・一貫性・再現性）を含んだ添削指示になっています。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAiAnalyze() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var prompt = buildAnalysisPrompt_(model);
  try {
    var raw = callAi_(prompt, model.settings, KL.AI_SYSTEM);
    var parsed = parseAnalysis_(raw);
    var sh = writeProposalSheet_(ss, parsed.review, parsed.proposals);
    writeAiSheet_(ss, buildReviewPrompt_(model), raw);
    ss.setActiveSheet(sh);
    ui.alert('AI 分析 完了',
      '「AI提案」シートに総評と ' + parsed.proposals.length + ' 件の修正提案を書き出しました。\n' +
      '内容を確認し、採用する行の「反映」にチェックを付けて「チェックした提案を反映」を実行してください。\n' +
      '※ 事実（社名・年月・数値）は必ず自分で確認してください。',
      ui.ButtonSet.OK);
  } catch (e) {
    writeAiSheet_(ss, buildReviewPrompt_(model), '');
    ui.alert('AI 分析 失敗', String(e.message || e) + '\n\n外部 API が使えない環境では「添削プロンプトだけ作る」を使い、Gemini に貼り付けてください。', ui.ButtonSet.OK);
  }
}

function menuApplyProposals() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var n = applyProposals_(ss);
  SpreadsheetApp.getUi().alert('反映完了', n + ' 件をシートに反映しました。「② 入力チェック」→「③ 生成」で確認してください。', SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuSetApiKey() {
  var ui = SpreadsheetApp.getUi();
  var which = ui.alert('APIキーを設定', 'Gemini のキーを設定しますか？\n（「いいえ」で Claude のキー）', ui.ButtonSet.YES_NO_CANCEL);
  if (which === ui.Button.CANCEL || which === ui.Button.CLOSE) return;
  var provider = which === ui.Button.YES ? 'gemini' : 'claude';
  var propName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
  var res = ui.prompt((provider === 'gemini' ? 'Gemini' : 'Claude') + ' APIキー',
    (provider === 'gemini' ? 'Google AI Studio で発行したキー' : 'sk-ant- で始まるキー') +
    'を貼り付けてください（このアカウントのユーザープロパティに保存され、共有者には見えません）。\n空欄で OK を押すと削除します。',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var key = nz_(res.getResponseText());
  var props = PropertiesService.getUserProperties();
  if (key) { props.setProperty(propName, key); ui.alert('保存しました。「設定」シートの AIプロバイダ を ' + provider + ' にしてください。'); }
  else { props.deleteProperty(propName); ui.alert('削除しました。'); }
}

// ---------------- テンプレート

function askTemplateSpec_(ui, settings) {
  var res = ui.prompt('テンプレート',
    '用紙（Google ドキュメント / スプレッドシート）の URL か ID を入力してください。\n' +
    '空欄 → 「設定」シートの 履歴書テンプレート を使用',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return '';
  return nz_(res.getResponseText()) || nz_(settings['履歴書テンプレート']) || nz_(settings['職務経歴書テンプレート']);
}

function menuDiagnoseTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var spec = askTemplateSpec_(ui, model.settings);
  if (!spec) return;
  try {
    var tpl = resolveTemplateFile_(spec);
    var r = classifyTokens_(templateText_(tpl));
    ui.alert('テンプレート診断: ' + tpl.name,
      '認識したトークン (' + r.known.length + '): ' + (r.known.join(', ') || 'なし') + '\n\n' +
      '不明なトークン (' + r.unknown.length + '): ' + (r.unknown.join(', ') || 'なし') + '\n\n' +
      (r.missing.length ? '不足している主要トークン: ' + r.missing.join(', ') + '\n\nトークンが無い用紙なら「用紙にトークンを自動挿入」を試してください。' : '主要トークンは揃っています。「設定」シートにこの用紙の ID を入れて生成してください。'),
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('診断できません', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuAutoInsertTokens() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var model = loadModel(ss);
  var spec = askTemplateSpec_(ui, model.settings);
  if (!spec) return;
  try {
    var tpl = resolveTemplateFile_(spec);
    var folder = chooseOutputFolder_(ss, model.settings, null);
    var out = copyTemplateAsGoogle_(tpl, tpl.name.replace(/\.(docx?|xlsx?)$/i, '') + '_トークン入り', folder);
    var n = out.kind === 'doc' ? autoInsertTokensDoc_(out.id) : autoInsertTokensSheet_(out.id);
    var r = classifyTokens_(templateText_({ id: out.id, mime: out.kind === 'doc' ? MIME_.GDOC : MIME_.GSHEET }));
    ui.alert('トークンを挿入しました（' + n + ' 箇所）',
      'コピーを作成しました:\n' + out.url + '\n\n' +
      '開いて、{{...}} の位置が正しいか確認・修正してください（ラベルの右隣／次の行に入れています）。\n' +
      (r.missing.length ? '自動で入れられなかった主要トークン: ' + r.missing.join(', ') + '\n手で追記してください。\n\n' : '') +
      '確認できたら「設定」シートの 履歴書テンプレート／職務経歴書テンプレート にこの URL を入れてください。',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('自動挿入できません', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuTokenList() {
  var L = ['用紙に書くトークン（{{ }} 付き）', ''];
  L.push('【単一値】');
  KL.TOKENS_SINGLE.forEach(function (t) { L.push('{{' + t[0] + '}}' + (t[1] ? '　' + t[1] : '')); });
  L.push('');
  L.push('【行リスト】表の 1 行（スプレッドシートは開始セル）に置くと行数分展開');
  Object.keys(KL.TOKENS_LIST).forEach(function (n) {
    L.push(KL.TOKENS_LIST[n].cols.map(function (c) { return '{{' + n + '_' + c + '}}'; }).join(' ') + '　' + KL.TOKENS_LIST[n].note);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('トークン一覧') || ss.insertSheet('トークン一覧');
  sh.clear();
  sh.getRange(1, 1, L.length, 1).setValues(L.map(function (x) { return [x]; }));
  sh.setColumnWidth(1, 700);
  ss.setActiveSheet(sh);
}

function menuHelp() {
  SpreadsheetApp.getUi().alert('使い方 (v' + KL.VERSION + ')',
    '【流れ】\n' +
    '① 初期セットアップ → ② 各シートに入力 → ② 入力チェック → ③ 生成 → ④ AI 分析で提案を反映 → 再生成\n\n' +
    '【シート】\n' +
    '基本情報: 履歴書の氏名・住所など\n' +
    '学歴 / 職歴: 両方の書類に使う。年は西暦4桁\n' +
    'プロジェクト: 職務経歴書の詳細。会社名は職歴と完全一致\n' +
    '経験・能力: 本文を書くか、5要素（ミッション→目標数字→課題→工夫点→結果）を埋める\n' +
    '免許・資格 / 実績 / 文章（職務要約・自己PR）\n' +
    '設定: 保存先・ファイル名パターン・テンプレート・PDF・AI\n\n' +
    '【出力】\n' +
    '生成時に保存先フォルダを聞きます（設定に書けば省略）。ファイル名は「氏名様_履歴書」形式。\n' +
    '会社規定の用紙がある場合は ⑤ でトークンを入れた用紙を作り、設定にその URL を入れると、その用紙に流し込みます。\n\n' +
    '【注意】\n' +
    'このスプレッドシートには個人情報が入ります。共有設定に注意し、GitHub 等に実データを置かないでください。',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
