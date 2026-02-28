# Backend: Filtro de busca de produto – GET /invoice/product

**Objetivo:** Adicionar suporte a parâmetro de busca no endpoint `GET /invoice/product` para filtrar produtos por nome ou código, seguindo o padrão já usado em `GET /invoice/shopping-lists`.

---

## Contexto

Na tela **Invoices Management** (aba Produtos), o front precisa de um filtro de busca de produto. Atualmente o endpoint retorna todos os produtos (ou até `limit`), sem filtro por termo.

O padrão do sistema para busca é o usado em **Listas de Compras**:
- `GET /invoice/shopping-lists?search=termo&page=1&limit=20&status=all`
- O parâmetro `search` filtra no backend e retorna apenas os itens que correspondem.

---

## Solicitação

Adicionar o parâmetro **`search`** (opcional) ao endpoint `GET /invoice/product`:

```
GET /invoice/product?search=iphone&limit=100
GET /invoice/product?search=15%20pro&limit=50
GET /invoice/product?limit=1000  (sem search = comportamento atual)
```

### Comportamento esperado

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `search` | string | Não | Termo de busca. Filtra produtos cujo `name` ou `code` contenha o termo (case-insensitive, parcial). |
| `limit` | number | Não | Já existente. Limite de resultados. |
| `page` | number | Não | Se existir paginação, página atual. |

### Regras de filtro

- Busca **parcial** em `name` e `code` (ex.: `"iphone"` encontra "IPHONE 15 PRO 256GB", "IPHONE 17 256GB")
- **Case-insensitive** (ex.: "Iphone" = "IPHONE")
- Se `search` for vazio ou omitido, retornar todos (comportamento atual)
- Manter compatibilidade com o formato de resposta atual: `{ products: [...], totalProducts, page, limit, totalPages }` ou array direto

### Exemplo de resposta (200)

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "IPHONE 15 PRO 256GB AZUL",
      "code": "148",
      "priceweightAverage": 534.00,
      "weightAverage": 0.2,
      "description": "...",
      "active": true
    }
  ],
  "totalProducts": 12,
  "page": 1,
  "limit": 100,
  "totalPages": 1
}
```

---

## Uso no frontend

Após a implementação, o front em `ProductsTab` (e outros pontos que precisem) passará a chamar:

```javascript
api.get("/invoice/product", {
  params: {
    search: searchTerm || undefined,
    limit: 1000,
  },
});
```

Com debounce no input de busca (ex.: 300–500 ms) para evitar muitas requisições.

---

## Referências

- **Padrão similar:** `GET /invoice/shopping-lists` com `params: { search, page, limit, status }`
- **Front:** `src/pages/gestao-invoices/components/sections/ProductsTab.tsx`
- **Outros consumidores:** `InvoiceProducts`, `ReviewPdfModal`, `MultiInvoiceReviewModal`, `LostProductsTab` – podem passar a usar `search` quando necessário.
