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
