/**
 * 会社版の設定（見本）。companies/<会社名>/05_Company.js にコピーして書き換え、
 *   node gas/resume-kit/bundle.mjs --company gas/resume-kit/companies/<会社名>
 * で dist/resume-kit-<会社名>.gs を作る。
 * 実在の会社名・許可番号を入れたフォルダーは .gitignore で除外している（公開リポジトリに載せない）。
 */

KL.COMPANY = {
  name: 'サンプル人材株式会社',
  license: '厚生労働大臣許可番号 有料職業紹介事業 00-000000'
};

KL.MENU_TITLE = '履歴書ツール（' + KL.COMPANY.name + '）';
// 標準レイアウトの職務経歴書・推薦書のフッター
setKeyDefault_(KL.SETTING_KEYS, '会社フッター', KL.COMPANY.name + '\n' + KL.COMPANY.license);
// 推薦書の推薦者会社
setKeyDefault_(KL.SUISEN_KEYS, '推薦者会社', KL.COMPANY.name);
