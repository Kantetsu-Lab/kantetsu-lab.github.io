/**
 * Notion からコンテンツを取得して content/*.json と public/images/ に書き出す。
 * NOTION_TOKEN が無い場合は既存の JSON を残したまま何もせず終了する
 * （ローカル開発やトークン未設定時でもビルドを通すため）。
 *
 * Notion がホストする画像 URL は約1時間で失効するため、
 * ビルド時にダウンロードしてローカルパスに差し替える。
 */
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// ローカル実行用に .env があれば読み込む(既存の環境変数が優先)
const envFile = path.join(import.meta.dirname, "..", ".env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DB_ID = process.env.NOTION_PROJECTS_DB_ID;
const WORKOUTS_DB_ID = process.env.NOTION_WORKOUTS_DB_ID;

const ROOT = path.join(import.meta.dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const IMAGES_DIR = path.join(ROOT, "public", "images");

if (!NOTION_TOKEN || !PROJECTS_DB_ID || !WORKOUTS_DB_ID) {
  console.warn(
    "[fetch-content] NOTION_TOKEN / NOTION_PROJECTS_DB_ID / NOTION_WORKOUTS_DB_ID が未設定。既存の content/*.json を使います。"
  );
  process.exit(0);
}

const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

/* eslint-disable @typescript-eslint/no-explicit-any */

function plainText(prop: any): string {
  const parts = prop?.rich_text ?? prop?.title ?? [];
  return parts.map((t: any) => t.plain_text).join("");
}

async function queryAll(dataSourceId: string, body: Record<string, unknown>) {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await (notion as any).dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      ...body,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

/** Notion ホストの画像をダウンロードしてローカルパスを返す */
async function downloadImage(url: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const ext =
      contentType.includes("png") ? "png"
      : contentType.includes("gif") ? "gif"
      : contentType.includes("webp") ? "webp"
      : contentType.includes("svg") ? "svg"
      : "jpg";
    const filename = `${key}.${ext}`;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(IMAGES_DIR, filename), buf);
    return `/images/${filename}`;
  } catch (e) {
    console.warn(`[fetch-content] 画像取得失敗: ${url}`, e);
    return null;
  }
}

/** markdown 中の Notion 画像 URL をダウンロードしてローカルパスへ置換 */
async function localizeImages(markdown: string, pageId: string): Promise<string> {
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let result = markdown;
  let index = 0;
  for (const match of markdown.matchAll(imageRegex)) {
    const [full, alt, url] = match;
    const local = await downloadImage(url, `${pageId}-${index++}`);
    if (local) result = result.replace(full, `![${alt}](${local})`);
  }
  return result;
}

async function fetchProjects() {
  const pages = await queryAll(PROJECTS_DB_ID!, {
    filter: { property: "Published", checkbox: { equals: true } },
    sorts: [{ property: "Date", direction: "descending" }],
  });

  const projects = [];
  for (const page of pages) {
    const p = page.properties;
    const pageId = page.id.replace(/-/g, "");

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const rawBody = n2m.toMarkdownString(mdBlocks).parent ?? "";
    const body = await localizeImages(rawBody, pageId);

    let cover: string | null = null;
    const coverUrl = page.cover?.file?.url ?? page.cover?.external?.url;
    if (coverUrl) cover = await downloadImage(coverUrl, `${pageId}-cover`);

    projects.push({
      id: page.id,
      name: plainText(p.Name),
      slug: plainText(p.Slug) || pageId,
      description: plainText(p.Description),
      tags: (p.Tags?.multi_select ?? []).map((t: any) => t.name),
      date: p.Date?.date?.start ?? null,
      featured: p.Featured?.checkbox ?? false,
      githubUrl: p["GitHub URL"]?.url ?? null,
      demoUrl: p["Demo URL"]?.url ?? null,
      cover,
      body,
    });
  }
  return projects;
}

async function fetchWorkouts() {
  const pages = await queryAll(WORKOUTS_DB_ID!, {
    sorts: [{ property: "Date", direction: "descending" }],
  });

  return pages
    .map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        name: plainText(p.Name),
        date: p.Date?.date?.start ?? null,
        type: p.Type?.select?.name ?? "その他",
        duration: p.Duration?.number ?? null,
        distance: p.Distance?.number ?? null,
        memo: plainText(p.Memo),
      };
    })
    .filter((w) => w.date);
}

async function main() {
  await mkdir(CONTENT_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });

  const [projects, workouts] = await Promise.all([fetchProjects(), fetchWorkouts()]);

  await writeFile(
    path.join(CONTENT_DIR, "projects.json"),
    JSON.stringify(projects, null, 2)
  );
  await writeFile(
    path.join(CONTENT_DIR, "workouts.json"),
    JSON.stringify(workouts, null, 2)
  );

  console.log(
    `[fetch-content] 完了: projects ${projects.length}件 / workouts ${workouts.length}件`
  );
}

main().catch((e) => {
  // 取得失敗でもビルドは止めない(既存の content/*.json をそのまま使う)。
  // インテグレーション未接続・トークン失効などで毎日ビルドが死なないようにする。
  console.warn(
    "[fetch-content] Notion 取得に失敗したため、既存の content/*.json を使います:",
    e?.message ?? e
  );
});
