/**
 * 推薦書（人材紹介の推薦状、A4 縦）
 *  構成: 宛先・推薦者 → 候補者概要表 → 推薦理由（ポイント）→ 推薦文 → 経歴概要 → 人物像 → 転職理由 → 懸念点と見解 → 結び
 */

function composeSuisen_(model) {
  var s = model.suisen || {};
  var jobs = sortNewestFirst_(model.jobs);
  var cur = jobs[0];
  var grads = model.education.filter(function (e) { return /(卒業|修了)/.test(e.kind); })
    .sort(function (a, b) { return (ymKey_(a.year, a.month) || 0) - (ymKey_(b.year, b.month) || 0); });
  var lastGrad = grads.length ? grads[grads.length - 1] : null;
  var date = parseDate_(s['推薦日']) || model.asOf;
  var career = jobs.map(function (j) {
    return formatPeriod_(j.startY, j.startM, j.endY, j.endM) + '　' + j.company + (j.position ? '（' + j.position + '）' : '');
  });
  return {
    dateLabel: formatJaDate_(date),
    to: nz_(s['推薦先企業']),
    toDept: nz_(s['推薦先部署・ご担当者']),
    position: nz_(s['推薦ポジション']),
    from: [nz_(s['推薦者会社']), nz_(s['推薦者部署・役職']), nz_(s['推薦者氏名']), nz_(s['推薦者連絡先'])].filter(function (x) { return x; }),
    fromName: nz_(s['推薦者氏名']),
    candidate: nz_(model.basic['氏名']) + (nz_(model.basic['ふりがな']) ? '（' + model.basic['ふりがな'] + '）' : '') + (model.age !== null ? '　' + model.age + '歳' : ''),
    current: cur ? cur.company + (cur.position ? '（' + cur.position + '）' : '') + (cur.endY === null ? '' : '　※' + formatYm_(cur.endY, cur.endM) + ' 退職') : '',
    education: lastGrad ? formatYm_(lastGrad.year, lastGrad.month) + '　' + lastGrad.school + ' ' + lastGrad.kind : '',
    salaryNow: nz_(s['現在年収']), salaryWish: nz_(s['希望年収']),
    joinable: nz_(s['入社可能時期']), location: nz_(s['希望勤務地']), others: nz_(s['他社選考状況']),
    points: lines_(s['推薦ポイント']).map(function (x) { return x.replace(/^[・\-•●]\s*/, ''); }),
    letter: lines_(s['推薦文']),
    career: career,
    summary: lines_(model.texts.summary),
    persona: lines_(s['人物像・面談所感']),
    reason: lines_(s['転職理由']),
    concern: lines_(s['懸念点と見解']),
    licenses: model.licenses.filter(function (l) { return l.onRirekisho; }).map(function (l) { return l.name; })
  };
}

/** 推薦書固有のチェック */
function runSuisenChecks_(model) {
  var out = [];
  var s = model.suisen || {};
  function add(level, item, message) { out.push({ level: level, where: KL.SHEET.SUISEN, item: item, message: message }); }
  ['推薦先企業', '推薦ポジション', '推薦者会社', '推薦者氏名'].forEach(function (k) { if (!nz_(s[k])) add('ERROR', k, '未入力です。'); });
  if (!nz_(s['推薦文'])) add('ERROR', '推薦文', '未入力です。「④ 推薦書を AI で下書き」も使えます。');
  var n = lines_(s['推薦ポイント']).length;
  if (n === 0) add('WARN', '推薦ポイント', '未入力です。3つが目安。');
  else if (n > 5) add('WARN', '推薦ポイント', n + '件あります。3〜5件に絞ると伝わりやすくなります。');
  var c = charCount_(s['推薦文']);
  if (c && (c < 300 || c > 1000)) add('WARN', '推薦文', c + '字です。400〜800字が目安。');
  if (nz_(s['推薦文']) && !hasNumber_(s['推薦文'])) add('WARN', '推薦文', '数値の実績がありません。');
  if (!nz_(s['懸念点と見解'])) add('INFO', '懸念点と見解', '空欄です。短期離職・ブランク・未経験領域などは先回りして見解を書くと通過率が上がります。');
  if (!nz_(model.basic['氏名'])) add('ERROR', '氏名', '「基本情報」の氏名が未入力です。');
  return out;
}

function buildSuisenDoc_(model, ss, folder, tpl) {
  // tpl: undefined → 設定シートの値 / null → 標準レイアウト / { spec, sheetName } → 台帳で選んだ用紙
  if (tpl) return buildFromTemplate_(model, '推薦書', folder, tpl);
  if (tpl === undefined && nz_(model.settings['推薦書テンプレート'])) return buildFromTemplate_(model, '推薦書', folder);
  var d = composeSuisen_(model);
  var font = model.settings['推薦書フォント'] || 'Noto Sans JP';
  var doc = newA4Doc_(outputFileName_(model, '推薦書'), font, 10.5);
  var body = doc.getBody();
  var base = { font: font, size: 10.5 };

  addPara_(body, d.dateLabel, { font: font, size: 10.5, align: 'right' });
  addPara_(body, d.to + '　御中', { font: font, size: 12, bold: true, before: 6 });
  if (d.toDept) addPara_(body, d.toDept + '　様', base);
  d.from.forEach(function (l, i) { addPara_(body, l, { font: font, size: 10.5, align: 'right', before: i === 0 ? 8 : 0 }); });
  addPara_(body, '推　薦　書', { font: font, size: 18, bold: true, align: 'center', before: 14, after: 10 });
  addPara_(body, '拝啓　時下ますますご清栄のこととお慶び申し上げます。', base);
  addPara_(body, '下記の者を貴社「' + d.position + '」に推薦いたします。ご高覧のほど、よろしくお願い申し上げます。', { font: font, size: 10.5, after: 8 });

  // 候補者概要（2 列表、結合なし）
  var rows = [['候補者', d.candidate], ['推薦ポジション', d.position], ['現職', d.current], ['最終学歴', d.education]];
  if (d.licenses.length) rows.push(['主な資格', d.licenses.join('、')]);
  if (d.salaryNow || d.salaryWish) rows.push(['年収', (d.salaryNow ? '現在 ' + d.salaryNow : '') + (d.salaryNow && d.salaryWish ? '　／　' : '') + (d.salaryWish ? '希望 ' + d.salaryWish : '')]);
  if (d.joinable) rows.push(['入社可能時期', d.joinable]);
  if (d.location) rows.push(['希望勤務地', d.location]);
  if (d.others) rows.push(['他社選考状況', d.others]);
  var t = newTable_(body, rows.length, 2, [110, KL.CONTENT_W - 110], 0.75);
  rows.forEach(function (r, i) {
    setCell_(t.getRow(i).getCell(0), r[0], { font: font, size: 9.5, bold: true, bg: '#eef2f7', align: 'center' });
    setCell_(t.getRow(i).getCell(1), r[1], { font: font, size: 10 });
  });

  if (d.points.length) {
    addSectionHeading_(body, '推薦理由', font);
    d.points.forEach(function (p, i) { addPara_(body, (i + 1) + '. ' + p, { font: font, size: 10.5, bold: true, before: 2 }); });
  }
  if (d.letter.length) {
    addSectionHeading_(body, '推薦文', font);
    d.letter.forEach(function (l) { addPara_(body, l, base); });
  }
  addSectionHeading_(body, '経歴概要', font);
  (d.summary.length ? d.summary : []).forEach(function (l) { addPara_(body, l, base); });
  d.career.forEach(function (l, i) { addPara_(body, '・' + l, { font: font, size: 10.5, before: i === 0 && d.summary.length ? 4 : 0 }); });
  if (d.persona.length) {
    addSectionHeading_(body, '人物像・面談所感', font);
    d.persona.forEach(function (l) { addPara_(body, l, base); });
  }
  if (d.reason.length) {
    addSectionHeading_(body, '転職理由', font);
    d.reason.forEach(function (l) { addPara_(body, l, base); });
  }
  if (d.concern.length) {
    addSectionHeading_(body, '懸念点と見解', font);
    d.concern.forEach(function (l) { addPara_(body, l, base); });
  }
  addPara_(body, '何卒ご検討のほど、よろしくお願い申し上げます。', { font: font, size: 10.5, before: 14 });
  addPara_(body, '敬具', { font: font, size: 10.5, align: 'right' });
  addPara_(body, '添付：履歴書、職務経歴書', { font: font, size: 9.5, before: 8, color: '#555555' });

  addCompanyFooter_(doc, model.settings, font);
  return finalizeDoc_(doc, folder, model.settings);
}

/** 推薦書の AI 下書き用プロンプト（提案 JSON を返させ、AI提案シートで確認→反映） */
function buildSuisenDraftPrompt_(model) {
  var s = model.suisen || {};
  var L = [];
  L.push('あなたは人材紹介会社のキャリアアドバイザーです。以下の候補者情報と面談メモから、企業に提出する推薦書の下書きを作り、JSON のみを返してください。');
  L.push('');
  L.push('# 推薦先');
  L.push('企業: ' + (nz_(s['推薦先企業']) || '（未入力）') + ' / ポジション: ' + (nz_(s['推薦ポジション']) || '（未入力）'));
  L.push('');
  L.push('# 書き方');
  L.push('- 推薦ポイント: 3つ。1行30字以内の見出し。ポジションの要件に結びつく強みを、根拠となる数値実績とセットで');
  L.push('- 推薦文: 400〜800字。①結論（なぜこのポジションに推薦するか）②根拠となる経験と数値 ③再現性（どういう考え方で成果を出したか）④入社後の貢献イメージ の順。敬体');
  L.push('- 人物像・面談所感: 150〜300字。面談メモの事実に基づく');
  L.push('- 懸念点と見解: 企業が気にしそうな点（在籍期間の短さ、未経験領域、年収ギャップ等）と、それに対する見解・根拠。無ければ ""');
  L.push('- 事実（社名・年月・数値）は入力に無いものを創作しない。足りない数値は「【要確認: 〇〇】」と書く');
  L.push('');
  L.push('# 出力 JSON');
  L.push('{ "review": "推薦の組み立て方の要点（3行）", "proposals": [');
  L.push('  { "address": "推薦書!推薦ポイント", "current": "", "proposed": "1行1項目で改行 \\n 区切り", "reason": "", "priority": "高" },');
  L.push('  { "address": "推薦書!推薦文", ... }, { "address": "推薦書!人物像・面談所感", ... }, { "address": "推薦書!懸念点と見解", ... }');
  L.push('] }');
  L.push('');
  L.push('# 面談メモ');
  L.push(nz_(s['面談メモ']) || '（なし）');
  L.push('');
  L.push('# 既存の推薦書入力');
  ['推薦ポイント', '推薦文', '人物像・面談所感', '転職理由', '懸念点と見解', '現在年収', '希望年収', '入社可能時期'].forEach(function (k) {
    L.push('[推薦書!' + k + '] ' + (nz_(s[k]) || '（未入力）'));
  });
  L.push('');
  L.push('# 候補者情報');
  L.push(buildContentDump_(model));
  return L.join('\n');
}
