# api-fe-test(前端)

POC 前端。消費後端 `api-be-test` 的 OpenAPI 合約,用 `openapi-typescript` 產生型別。

- `openapi.yaml` —— 從後端同步過來的合約快照(**別手改**,由 workflow 覆蓋)
- `src/api/schema.ts` —— 產生出來的型別(`npm run gen`)
- `src/app.ts` —— 用型別呼叫 API 的範例

## 指令

```bash
npm install
npm run gen          # openapi.yaml → src/api/schema.ts
npm run typecheck    # tsc --noEmit
```

## 自動同步

`.github/workflows/sync-api.yml` 是 **thin caller**,實際邏輯在
[`s930415/be2fe-actions`](https://github.com/s930415/be2fe-actions)(reusable workflow,pin `@v2`)。

它監聽後端來的 `repository_dispatch`(type `backend-api-updated`),然後:
反查 `subscribe` 決定「我哪些分支訂閱了該後端分支」→ checkout 目標分支 →
抓該 sha 的 `openapi.yaml` → `npm run gen` → typecheck → 有 diff 就開 PR(base = 目標分支)。

### 分支訂閱(前端當家)

caller 的 `subscribe`(key = 前端分支 → 要監聽的後端分支)決定對應;**同名(main→main、uat→uat)免寫**。
本 POC 目前設:

```yaml
subscribe: '{"feature/exp": "dev"}'   # feature/exp 監聽後端 dev
```

需先在 repo Settings 打開「Allow GitHub Actions to create and approve pull requests」,見上層 [SETUP.md](../SETUP.md)。
