# Status – Implementações Backend (Invoices e Import PDF)

Documento de acompanhamento do que foi implementado no backend e referências.

---

## Itens implementados (jan/2025)

### 1. Validar productId (invoices/create.ts)
- Após validar supplier, busca todos `body.products[].id` em Product (por id).
- Os não encontrados por id são buscados por code (SKU); quem for encontrado por code passa a usar o id (UUID).
- Se ainda restar algum inválido → **400** com:
  ```json
  { "message": "Produto(s) inválido(s). ID ou SKU não encontrado em Product.", "invalidProductIds": ["xxx", ...] }
  ```
- Na criação da invoice, usa o id já resolvido (UUID), evitando erro de FK.

### 2. Validar supplierId (invoices/create.ts)
- Se o fornecedor não existir → **400** com:
  ```json
  { "message": "Fornecedor não encontrado", "supplierId": "xxx" }
  ```

### 3. Atualizar custo do produto ao salvar invoice (invoices/create.ts)
- Depois de `prisma.invoice.create`, para cada `body.products` chama `prisma.product.update` com `priceweightAverage: product.value` (valor unitário da invoice).
- O custo do produto passa a ser o valor da última invoice em que ele aparece.

### 4. SupplierAlias (modelo + endpoints + doc)
- **Prisma:** model `SupplierAlias` com `pdfSupplierName` (unique), `supplierId` (FK para Supplier), createdAt, updatedAt.
- **Controllers:** supplier/alias/create-or-update.ts, list.ts, delete.ts.
- **Rotas:**
  - `POST /invoice/supplier/alias` – criar/atualizar alias
  - `GET /invoice/supplier/aliases` – listar aliases
  - `DELETE /invoice/supplier/alias/:id` – remover alias  
  (registradas antes de `/invoice/supplier/:id`)
- **Doc:** `docs/PROMPT_BACKEND_SUPPLIER_ALIASES.md`.

**Implementado:** Import PDF – `extractInvoiceData()` extrai nome do fornecedor (primeira linha após BILL TO / Sold To / Customer). `findSupplierIdByAlias(pdfSupplierName)` busca em SupplierAlias e retorna `supplierId`. `invoiceData.supplierId` incluído na resposta de `POST /invoice/import-from-pdf`.

### 5. Documentação de status
- `docs/BACKEND_PENDENCIAS.md` – atualizado com status
- `docs/PENDENCIES_INVOICES_IMPORT_STATUS.md` – este documento

---

## Pendências no backend

**Todas implementadas (jan/2025).**

| # | Item                 | Status   |
|---|----------------------|----------|
| 3 | IMEIs / variantes    | ✅ Feito |
| 4 | Produtos com cores   | ✅ Feito |
| 6 | SupplierAlias – match no PDF | ✅ Feito |

- **#3/#4:** `expandProductsByVariants()`, `VARIANT_LINE_REGEX`, agrupamento IMEIs por variante.
- **#6:** `extractInvoiceData()` extrai nome após BILL TO/Sold To/Customer; `findSupplierIdByAlias()` retorna `supplierId`; `invoiceData.supplierId` na resposta de `POST /invoice/import-from-pdf`.

---

## Parser PDF – Status das correções (backend atualizado)

O backend atualizou o parser em `src/http/controllers/invoices/import-pdf.ts`. Resumo:

| Item | Status | Onde |
|------|--------|------|
| Data MM/DD/YYYY → YYYY-MM-DD | ✅ Corrigido | `extractInvoiceData()` |
| Detectar padrão [QTD] [COR]: | ✅ Corrigido | `VARIANT_LINE_REGEX` + `expandProductByVariants()` |
| Separar cada variante em um produto | ✅ Corrigido | `expandProductByVariants()` |
| Agrupar IMEIs por variante | ✅ Corrigido | Consumo de linhas 15 dígitos após cada linha de variante |
| Mesma linha nome+variante+QTY (I15128P2 02 PINK – não misturar com linha anterior) | ✅ Corrigido | `extractProducts()` – prioridade prefix + look-ahead IMEIs + lastConsumedLineIndex |
| Nunca "SKU" nem IMEI como sku; nome sem sufixo variante | ✅ Corrigido | `getBaseSkuForVariant`, `stripVariantSuffixFromName`, `extractProducts`, `findProduct` |
| Fallback _COR em create invoice | ✅ Corrigido | `invoices/create.ts` – resolução por code base |
| Cor com duas palavras (PINK NEW, BLACK NEW) | ✅ Corrigido | `VARIANT_LINE_REGEX` – `([A-Za-z]+(?:\s+[A-Za-z]+)?)` |
| Linha de variante quebrada (07 + ULTRAMARINE:) | ✅ Corrigido | `normalizeVariantLines()` antes de `expandProductByVariants()` |

**Formatos reais no PDF (Invoice 2247):** variante com duas palavras (`02 PINK NEW:`, `BLACK NEW:`), variante sem dois pontos (`05 WHITE`, `05 BLACK`), quantidade e cor em linhas separadas (`07` + `ULTRAMARINE:` → normalizado para `07 ULTRAMARINE:`). Cabeçalho repetido no meio da tabela é ignorado.

**SKU não usado no import:** O backend retorna **`sku: ""`** em todos os produtos. O front remove ou exibe como quiser (ex.: tirar da linha do nome se vier junto). Nome e ordem dos produtos são preservados (ordem original da invoice, sem sort).

Contrato do import: `docs/PROMPT_BACKEND_IMPORT_PDF.md`. Regras e exemplos de variantes: `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`.
