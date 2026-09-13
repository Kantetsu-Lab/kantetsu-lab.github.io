// src/*.js を 1 ファイルに連結して dist/resume-kit.gs を作る（社用PCで Apps Script に貼り付ける用）
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'src');
const files = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const header = [
  '/*',
  ' * Kantetsu Lab 履歴書・職務経歴書ジェネレーター（Google Apps Script）',
  ' * このファイルは gas/resume-kit/src/*.js から自動生成されています。直接編集せず src を直して `node gas/resume-kit/bundle.mjs` を実行してください。',
  ` * generated: ${new Date().toISOString()}`,
  ' */',
  ''
].join('\n');
const body = files.map((f) => `// ===== ${f} =====\n${readFileSync(join(srcDir, f), 'utf8')}`).join('\n\n');
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'resume-kit.gs'), header + body);
console.log(`bundled ${files.length} files -> dist/resume-kit.gs`);
