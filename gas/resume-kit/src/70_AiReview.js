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

