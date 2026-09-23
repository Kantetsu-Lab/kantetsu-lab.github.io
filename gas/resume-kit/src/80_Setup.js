/**
 * 初期セットアップ: 必要なシートを作り、見出し・入力ガイド・プルダウン・サンプル行を入れる。
 * 既存のシートは壊さない（見出しとメモだけ上書き。データ行は触らない）。
 */

function setupSheets_(ss, withSample) {
  var order = [KL.SHEET.BASIC, KL.SHEET.EDUCATION, KL.SHEET.JOBS, KL.SHEET.PROJECTS, KL.SHEET.SKILLS,
    KL.SHEET.LICENSES, KL.SHEET.ACHIEVEMENTS, KL.SHEET.TEXTS, KL.SHEET.SUISEN, KL.SHEET.ATTACH, KL.SHEET.SETTINGS];

  setupKeyValueSheet_(ss, KL.SHEET.BASIC, KL.BASIC_KEYS, withSample ? sampleBasic_() : null);
  setupKeyValueSheet_(ss, KL.SHEET.TEXTS, KL.TEXT_KEYS, withSample ? sampleTexts_() : null);
  setupKeyValueSheet_(ss, KL.SHEET.SUISEN, KL.SUISEN_KEYS, withSample ? sampleSuisen_() : null);
  setupKeyValueSheet_(ss, KL.SHEET.SETTINGS, KL.SETTING_KEYS, null);
  attachSheet_(ss);

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

function sampleSuisen_() {
  return {
    '推薦先企業': '株式会社サンプルコンサルティング',
    '推薦先部署・ご担当者': '人事部 採用ご担当者',
    '推薦ポジション': 'DXコンサルタント（医療・ヘルスケア領域）',
    '推薦者会社': 'サンプル人材株式会社',
    '推薦者部署・役職': 'キャリアアドバイザー',
    '推薦者氏名': '佐藤 花子',
    '推薦者連絡先': '03-0000-0000 / sato@example.com',
    '推薦ポイント': '医療現場の業務を分解し、待ち時間60%削減を実現した業務改善力\n4店舗横断でAI活用を定着させた推進力\n現場と経営の双方を理解した上での業務設計',
    '推薦文': '田中様は、調剤薬局の薬剤師として現場業務に従事しながら、業務改善・DX推進担当として成果を上げてこられた方です。\n待ち時間の原因を業務量ではなく現場の優先順位判断のばらつきにあると仮説を立て、業務を週・日単位に分解して「今やらなくてよい業務」を明示することで、平均20分の待ち時間を8分（60%削減）に短縮されました。\nまた、AI活用では情報整理と候補提示をAI、最終判断を人が担う形で業務を再設計し、4店舗で月1回の講座を開催して定着まで伴走されています。\n医療現場の業務構造を理解し、仮説→実行→検証を回し切る姿勢は、貴社の医療・ヘルスケア領域のDX支援において即戦力として活躍いただけるものと考え、推薦いたします。',
    '人物像・面談所感': '論理的かつ誠実なお人柄で、質問に対して結論から簡潔に回答されます。現場の声を丁寧に拾いながらも、構造で課題を捉える視点をお持ちです。',
    '転職理由': '一店舗・一法人の改善にとどまらず、より多くの医療機関の業務変革に携わりたいため。',
    '懸念点と見解': '1社目の在籍が3ヶ月と短期ですが、調剤未経験から専門性を高める目的での転職であり、現職では2年以上継続して成果を上げていることから、定着性に懸念はないと考えます。',
    '現在年収': '462万円',
    '希望年収': '600万円（最低 550万円）',
    '入社可能時期': '内定後 3ヶ月',
    '希望勤務地': '東京',
    '面談メモ': ''
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
