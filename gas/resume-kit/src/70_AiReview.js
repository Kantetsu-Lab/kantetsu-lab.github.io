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
