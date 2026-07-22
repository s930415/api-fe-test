// 範例:用「產生出來的型別」去呼叫後端 API。
// 重點在 Product 型別是從 openapi.yaml 自動產生的 —— 後端改合約、型別跟著變,
// 這裡若用錯欄位,typecheck 會直接紅字,前端就能在 review PR 時第一時間看到。
import type { components } from './api/schema';

type Product = components['schemas']['Product'];

async function listProducts(): Promise<Product[]> {
  const res = await fetch('http://localhost:3000/products');
  return (await res.json()) as Product[];
}

listProducts().then((products) => {
  for (const p of products) {
    // supplier 是後端 dev 合約有的欄位 → 相容,commit / CI 應通過
    console.log(`${p.id}: ${p.name} - $${p.price} @ ${p.supplier}`);
  }
});
