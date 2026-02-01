# Contrato Front – Import PDF (atualizado)

Documento para o time de frontend: o que o backend retorna no **POST /invoice/import-from-pdf** e o que o front deve fazer.

---

## Resposta do backend (200)

```json
{
  "invoiceData": {
    "number": "2247",
    "date": "2025-11-28",
    "emails": ["..."],
    "supplierId": "uuid-opcional"
  },
  "products": [
    {
      "sku": "",
      "name": "APPLE - IPHONE 16 PRO 128GB P2 BLACK",
      "description": "5 BLACK",
      "quantity": 5,
      "rate": 690.00,
      "amount": 3450.00,
      "imeis": ["353...", "354...", ...],
      "validation": {
        "exists": true,
        "productId": "uuid-ou-null",
        "divergences": [],
        "needsReview": false,
        "matchedByAlias": false,
        "aliasId": null
      }
    }
  ],
  "summary": {
    "totalProducts": 10,
    "existingProducts": 5,
    "newProducts": 5,
    "productsWithDivergences": 0
  }
}
```

---

## O que mudou (obrigatório no front)

### 1. `sku` sempre vazio

- O backend **não preenche mais** `sku`; vem sempre **`""`**.
- **Front não deve** usar `sku` para identificar produto ou como fallback de `productId`.
- **Ao salvar a invoice:** enviar **`validation.productId`** quando existir. Quando **`productId` for `null` e `sku` for `""`**, **não enviar** o item até o usuário **vincular/selecionar o produto** (senão o backend pode retornar 400).
- Na UI: coluna SKU pode ser ocultada ou exibir "—" quando vazio.

### 2. Nome = só o modelo

- **`name`** já vem só com o modelo (ex.: `"APPLE - IPHONE 16 PRO 128GB P2"` ou `"APPLE - IPHONE 16 PRO 128GB P2 BLACK"` para variantes).
- O backend já remove SKU do nome; **o front não precisa** remover nada do nome no cliente.

### 3. Ordem original

- Os itens em **`products`** vêm na **mesma ordem da invoice/PDF**.
- O front deve **exibir na ordem recebida** (não ordenar por nome nem por SKU).

### 4. Payload ao criar invoice

- Cada item deve ter **`id`** = `validation.productId` quando existir.
- Quando **`validation.productId`** for `null`, o usuário precisa vincular um produto; só então enviar o `id` (UUID do produto) no payload.
- O backend aceita fallback por código (ex.: `I15PRO256P2_BLACK` → resolve para `I15PRO256P2`), mas como `sku` não vem mais preenchido, o front deve depender de **`validation.productId`** ou da seleção manual do usuário.

---

## Resumo de regras no front

| Regra | Ação no front |
|-------|----------------|
| `sku` vazio | Não usar `sku`; usar `validation.productId`; exigir vínculo quando `productId` for null. |
| Nome | Exibir o `name` como vem; não remover SKU (já vem só modelo). |
| Ordem | Manter a ordem de `products` ao exibir. |
| Salvar invoice | Enviar `id` = `validation.productId` ou id do produto selecionado; não enviar item sem `id` válido. |

---

## Referências

- **Backend – contrato completo do import:** `docs/PROMPT_BACKEND_IMPORT_PDF.md`
- **Backend – variantes e regras:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
