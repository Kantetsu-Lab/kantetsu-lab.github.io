# ポートフォリオサイト

AI で開発した作品と運動記録を載せるポートフォリオサイト。
Notion を CMS として使い、GitHub Pages で公開する。

- 公開 URL: https://kantetsu-lab.github.io/
- コンテンツ管理: Notion「ポートフォリオサイト管理」ページ配下の Projects / Workouts データベース

## 更新のしかた

1. Notion の **Projects**(作品) か **Workouts**(運動記録) データベースに行を追加・編集する
   - Projects は `Published` にチェックを入れたものだけサイトに出る
   - トップページに出したい作品は `Featured` にもチェック
2. 反映タイミング
   - **自動**: 毎日 5:00 JST に自動ビルド
   - **すぐ反映したいとき**: GitHub リポジトリの Actions タブ → 「Deploy to GitHub Pages」→ 「Run workflow」ボタン

## 開発

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 静的書き出し (out/)
```

`.env`(`.env.example` 参照) に `NOTION_TOKEN` を設定して `npm run fetch` を実行すると、
Notion の最新コンテンツを `content/*.json` と `public/images/` に取り込める。
トークン未設定の場合はコミット済みの JSON がそのまま使われる。

## 構成

- Next.js 16 (App Router, `output: "export"` で完全静的)
- Tailwind CSS v4 / motion (アニメーション) / Recharts (グラフ)
- `scripts/fetch-content.mts` — ビルド前に Notion からコンテンツ取得。
  Notion がホストする画像は URL が失効するためビルド時にダウンロードして同梱する
- `.github/workflows/deploy.yml` — push / 毎日定時 / 手動ボタンでビルド & デプロイ
