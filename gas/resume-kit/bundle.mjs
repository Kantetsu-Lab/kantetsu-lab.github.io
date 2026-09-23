// src/*.js を 1 ファイルに連結して dist/resume-kit.gs を作る（社用PCで Apps Script に貼り付ける用）
//   node bundle.mjs                                   → dist/resume-kit.gs（汎用）
//   node bundle.mjs --company companies/<名前>        → dist/resume-kit-<名前>.gs（会社設定を重ねた版）
// 会社フォルダーの *.js は src と名前順に並べて連結する（05_Company.js なら 00_Config の直後に入る）。
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ci = args.indexOf('--company');
const companyDir = ci >= 0 ? resolve(process.cwd(), args[ci + 1]) : null;
const oi = args.indexOf('--out');

const pick = (dir) => readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => ({ name: f, path: join(dir, f) }));
const files = pick(join(here, 'src')).concat(companyDir ? pick(companyDir) : []).sort((a, b) => a.name.localeCompare(b.name));
const label = companyDir ? basename(companyDir) : '';
const out = oi >= 0 ? resolve(process.cwd(), args[oi + 1]) : join(here, 'dist', label ? `resume-kit-${label}.gs` : 'resume-kit.gs');
const header = [
  '/*',
  ' * 履歴書・職務経歴書・推薦書ジェネレーター（Google Apps Script）' + (label ? `　会社版: ${label}` : ''),
  ' * このファイルは src/*.js' + (label ? ` と companies/${label}/*.js` : '') + ' から自動生成されています。直接編集しないでください。',
  ` * generated: ${new Date().toISOString()}`,
  ' */',
  ''
].join('\n');
const body = files.map((f) => `// ===== ${f.name} =====\n${readFileSync(f.path, 'utf8')}`).join('\n\n');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, header + body);
console.log(`bundled ${files.length} files -> ${out}`);
