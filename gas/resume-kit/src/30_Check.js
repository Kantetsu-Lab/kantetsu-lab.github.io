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
