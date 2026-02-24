# Contrato Front – Import PDF (atualizado)

Documento para o time de frontend: o que o backend retorna no **POST /invoice/import-from-pdf** e o que o front deve fazer.

---

## Implementação no backoffice (em conformidade)

O fluxo de import de PDF já existe no backoffice e está em conformidade com este contrato:

| Arquivo | Uso |
|---------|-----|
| **ImportPdfModal.tsx** | Chama `api.post("/invoice/import-from-pdf", formData)` com `multipart/form-data` e campo `file`. |
| **ReviewPdfModal.tsx** | Modal de revisão para PDF único. |
| **MultiInvoiceReviewModal.tsx** | Modal com abas para vários PDFs. |
| **InvoiceProducts.tsx** | Orquestra import, fila e salvamento. |

Validação de vínculo, uso de `validation.productId`, ordem dos produtos e demais regras deste documento estão implementados conforme o contrato.

---

## Resposta do backend (200)

```json
{
  "invoiceData": {
    "number": "2247",
    "date": "2025-11-28",
    "emails": ["..."],
    "supplierId": "uuid-opcional",
    "pdfSupplierName": "PROCYON TRADING & LOGISTICS",
    "supplierAliasId": "uuid-opcional"
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
- **IMEIs (NOVO)**: Inclua `imeis` (array de strings) em cada produto para salvar automaticamente:
  ```json
  {
    "products": [
      {
        "id": "uuid",
        "quantity": 23,
        "value": 534.00,
        "weight": 0.2,
        "total": 12282.00,
        "imeis": ["351232742215035", "357165272934258", ...]
      }
    ]
  }
  ```
  Os IMEIs serão salvos automaticamente quando a invoice for criada. Veja `docs/FRONTEND_SALVAR_IMEIS_AUTOMATICO.md` para mais detalhes.

### 5. Nome do fornecedor extraído do PDF

- **`invoiceData.pdfSupplierName`**: Nome do fornecedor extraído do cabeçalho do PDF (ex.: `"PROCYON TRADING & LOGISTICS"`).
- **`invoiceData.supplierAliasId`**: ID do alias vinculado (se houver vínculo existente).
- **`invoiceData.supplierId`**: ID do fornecedor vinculado (quando houver alias correspondente).

**Comportamento esperado no front:**
- Preencher automaticamente o campo "Nome na nota" com `pdfSupplierName`.
- Se `supplierAliasId` estiver presente, mostrar o vínculo no lado direito e **bloquear a edição** do campo quando vier da invoice via modal (modo import).
- Permitir vincular/editar apenas quando o usuário estiver editando manualmente (não em modo import).
- Quando o usuário vincular um fornecedor, usar `POST /invoice/supplier/alias` para criar/atualizar o alias.

---

## Resumo de regras no front

| Regra | Ação no front |
|-------|----------------|
| `sku` vazio | Não usar `sku`; usar `validation.productId`; exigir vínculo quando `productId` for null. |
| Nome | Exibir o `name` como vem; não remover SKU (já vem só modelo). |
| **Nome ao vincular** | **CRÍTICO:** Ao vincular um produto (ex.: nota tem "BLUE", usuário vincula com "IPHONE 17 256GB AZUL"), o **nome exibido deve permanecer o da nota** ("BLUE"/inglês). **Nunca** substituir pelo nome do produto vinculado. Vincular = apenas associar o `productId`; o título do card continua sendo `item.name` da API. |
| Ordem | **Manter a ordem de `products` ao exibir** – não reordenar por nome/SKU/cor. |
| Salvar invoice | Enviar `id` = `validation.productId` ou id do produto selecionado; não enviar item sem `id` válido. |
| Cores no nome | Backend **nunca** envia produto sem cor: sempre `name` com cor (ex.: "... P2 PINK", "... P2 BLACK") ou " COR NÃO IDENTIFICADA" se não detectar variante. Nota não lista produto sem cor. |
| IMEIs divergindo | Se `quantity` ≠ `imeis.length`, exibir alerta (como já faz). Backend compromete-se a enviar qty IMEIs por variante (próximas qty linhas após "05 BLACK:"). |
| `pdfSupplierName` | Preencher campo "Nome na nota" automaticamente com o nome extraído do PDF. |
| `supplierAliasId` | Se presente, mostrar vínculo no lado direito e **bloquear edição** quando vier da invoice via modal (modo import). |
| Vincular fornecedor | Usar `POST /invoice/supplier/alias` para criar/atualizar vínculo entre nome do PDF e fornecedor cadastrado. |

---

## O que o backend garante

- **Ordem:** `products` na mesma ordem da invoice/PDF.
- **NEW: vs P2/P3:** Produtos com "NEW:" na descrição têm a **cor já no nome** (coluna PRODUCTS); o backend não expande por variantes e devolve um item com `name` já contendo a cor. Produtos com **P2** ou **P3** no nome são expandidos por variantes na descrição (um item por cor, com IMEIs por variante).
- **Cores:** Cada variante com `name` = modelo + " " + cor (PINK, BLACK, NATURAL, etc.); nome base sem "APPLE" duplicado no final.
- **IMEIs:** Após "05 BLACK:", as próximas 5 linhas = 5 IMEIs dessa variante; `quantity` deve bater com `imeis.length`.

---

## Checklist para o front

- [ ] Não usar `sku` da resposta (sempre vazio); usar `validation.productId` para salvar.
- [ ] Quando `productId` for null, exigir vínculo do usuário antes de permitir salvar a invoice.
- [ ] Exibir `products` na **ordem recebida** (não ordenar por nome/SKU/cor).
- [ ] Exibir o `name` como vem (já com cor ou " COR NÃO IDENTIFICADA"); não remover nada do nome.
- [ ] **Ao vincular produto:** manter o `name` da nota no título do card; não trocar pelo nome do produto do banco (ex.: nota "BLUE" → manter "BLUE", não exibir "AZUL").
- [ ] Se `quantity` ≠ `imeis.length`, exibir alerta de IMEIs divergentes.
- [ ] Coluna SKU: ocultar ou mostrar "—" quando vazio.

---

## Referências

- **Front – índice de prompts/contratos:** no frontend, `docs/PROMPTS_E_CONTRATOS_BACKEND.md` (tabela por fluxo: Import PDF, histórico recebimentos, sessão expirada, listas PUT, invoices, IMEIs, aliases).
- **Backend – contrato completo do import:** `docs/PROMPT_BACKEND_IMPORT_PDF.md`
- **Backend – variantes e regras:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
