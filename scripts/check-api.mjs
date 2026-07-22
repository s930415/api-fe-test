#!/usr/bin/env node
// be2fe:驗證「本前端分支的程式碼」是否與「它訂閱的後端分支最新 API 合約」相容。
// pre-commit hook 與 CI on:push 共用同一支腳本(single source of truth)。
//
// 行為:
//   - 依 .be2fe.json 的 subscribe 找出本分支訂閱的後端分支(同名 fallback)
//   - 抓該後端分支的 openapi.yaml(raw URL)
//   - 用它重新產生型別,tsc --noEmit typecheck
//   - 型別不相容 → exit 1(擋 commit / CI 紅)
//   - 抓不到合約(離線 / 分支不存在)→ 只警告,exit 0(不擋)
//   - 全程用暫存 + 事後還原,不動 working tree 的檔案

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('.be2fe.json', 'utf8'));
const backendRepo = cfg.backendRepo;
const specPath = cfg.specPath || 'openapi.yaml';
const schemaPath = cfg.schemaPath || 'src/api/schema.ts';
const subscribe = cfg.subscribe || {};

// 目前前端分支:CI 用 GITHUB_REF_NAME,本地用 git
const feBranch =
  process.env.GITHUB_REF_NAME ||
  execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

const beBranch = subscribe[feBranch] || feBranch; // 同名 fallback
const url = `https://raw.githubusercontent.com/${backendRepo}/${beBranch}/${specPath}`;

console.log(`[check-api] 前端分支 ${feBranch} → 訂閱後端分支 ${beBranch}`);
console.log(`[check-api] 抓合約:${url}`);

let spec;
try {
  spec = execSync(`curl -sSf ${JSON.stringify(url)}`, { encoding: 'utf8' });
} catch {
  console.warn('[check-api] ⚠️ 抓不到後端合約(離線 / 該分支尚無 openapi.yaml)→ 略過驗證');
  process.exit(0); // 網路 / 缺檔只警告,不擋
}

const tmpSpec = '.be2fe.tmp.openapi.yaml';
const backup = existsSync(schemaPath) ? readFileSync(schemaPath) : null;
writeFileSync(tmpSpec, spec);

let failed = false;
try {
  execSync(`npx openapi-typescript ${tmpSpec} -o ${schemaPath}`, { stdio: 'inherit' });
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('[check-api] ✅ 前端程式碼與後端合約相容');
} catch {
  failed = true;
} finally {
  if (backup !== null) writeFileSync(schemaPath, backup); // 還原,不動 working tree
  rmSync(tmpSpec, { force: true });
}

if (failed) {
  console.error(`\n[check-api] ❌ 型別不相容!你的程式碼與後端 ${beBranch} 的最新 API 合約對不上。`);
  console.error('   看上面 tsc 錯誤修正用到的欄位;真的要先跳過:git commit --no-verify');
  process.exit(1);
}
