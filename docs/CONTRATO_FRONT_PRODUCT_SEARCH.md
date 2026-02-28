# Prompt Front – Filtro de busca de produto (Invoices Management)

Documento para o time de frontend: como consumir o parâmetro `search` no **GET /invoice/product** na tela de Produtos (Invoices Management).

---

## Endpoint

```
GET /invoice/product?search=termo&limit=1000&page=1
```

### Parâmetros (query)

| Parâmetro | Tipo   | Obrigatório | Descrição |
|-----------|--------|-------------|-----------|
| `search`  | string | Não         | Termo de busca. Filtra produtos cujo `name` ou `code` contenha o termo (case-insensitive, parcial). |
| `limit`   | number | Não         | Limite de resultados (padrão: 1000). |
| `page`    | number | Não         | Página atual (padrão: 1). |

### Resposta (200)

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

## Implementação no front (ProductsTab)

- [x] Input de busca na aba Produtos (ProductsTab).
- [x] Parâmetro `search` enviado na chamada `GET /invoice/product`.
- [x] Debounce de 400 ms no input.
- [x] Quando `search` vazio, não enviar o parâmetro (comportamento atual).

---

## Referências

- **Backend – contrato:** `docs/PROMPT_BACKEND_PRODUCT_SEARCH.md`
- **Padrão similar:** `GET /invoice/shopping-lists` com `params: { search, page, limit, status }`
