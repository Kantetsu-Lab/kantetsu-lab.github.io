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
