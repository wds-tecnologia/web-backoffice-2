# Pendências Backend - Invoices e Import PDF

Itens que dependem do backend para serem resolvidos.

---

## Status – Implementado no backend (jan/2025)

| # | Item                    | Status | Observação |
|---|-------------------------|--------|------------|
| 1 | Validar productId       | ✅ Feito | 400 com `invalidProductIds`; fallback por code/SKU |
| 2 | Validar supplierId      | ✅ Feito | 400 com `message` e `supplierId` |
| 3 | IMEIs / variantes       | ✅ Feito | expandProductsByVariants, VARIANT_LINE_REGEX, agrupamento por variante |
| 4 | Produtos com cores      | ✅ Feito | Mesmo que #3 – separação por variante |
| 5 | Atualizar custo produto | ✅ Feito | `priceweightAverage` atualizado ao salvar invoice |
| 6 | SupplierAlias           | ✅ Feito | Modelo + endpoints + match no PDF (extractInvoiceData + findSupplierIdByAlias) |

Ver `docs/PENDENCIES_INVOICES_IMPORT_STATUS.md` para detalhes.

---

## 1. ~~Foreign key productId~~ ✅ Resolvido

**Implementado:** Validação em `invoices/create.ts`. Busca por id; se não encontrar, busca por code (SKU). Erro 400 com `{ message: "Produto(s) inválido(s)...", invalidProductIds: [...] }`.

---

## 2. ~~Supplier not found~~ ✅ Resolvido

**Implementado:** Validação em `invoices/create.ts`. Erro 400 com `{ message: "Fornecedor não encontrado", supplierId: "xxx" }`.

---

## 3. ~~IMEIs a mais ou a menos~~ ✅ Resolvido

**Implementado:** `import-pdf.ts` – `expandProductsByVariants()`, `VARIANT_LINE_REGEX`, agrupamento de IMEIs por variante. Linha "05 BLACK:" + 5 IMEIs + "05 NATURAL:" + 5 IMEIs vira 2 produtos, cada um com seus 5 IMEIs.

---

## 4. ~~Produtos com cores – separar por variante~~ ✅ Resolvido

**Implementado:** Mesmo que #3 – `expandProductsByVariants()` separa por variante.

---

## 5. ~~Atualizar custo do produto~~ ✅ Resolvido

**Implementado:** Em `invoices/create.ts`, após `prisma.invoice.create`, atualiza `Product.priceweightAverage` com o valor unitário da invoice.

---

## 6. ~~Vincular fornecedor (alias)~~ ✅ Resolvido

**Implementado no backend:**
- Modelo `SupplierAlias` (pdfSupplierName, supplierId).
- Endpoints: `POST /invoice/supplier/alias`, `GET /invoice/supplier/aliases`, `DELETE /invoice/supplier/alias/:id`.
- **Match no PDF:** `extractInvoiceData()` extrai nome do fornecedor (linha após BILL TO / Sold To / Customer); `findSupplierIdByAlias()` busca em SupplierAlias; `invoiceData.supplierId` incluído na resposta de `POST /invoice/import-from-pdf`.

---

## Resumo

| # | Item                    | Status   |
|---|-------------------------|----------|
| 1 | Validar productId       | ✅ Feito |
| 2 | Validar supplierId      | ✅ Feito |
| 3 | IMEIs / variantes       | ✅ Feito |
| 4 | Separar por variante    | ✅ Feito |
| 5 | Atualizar custo produto | ✅ Feito |
| 6 | Alias de fornecedor     | ✅ Feito |

---

## Referências

- `docs/PROMPT_BACKEND_IMPORT_PDF.md`
- `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
- `docs/PROMPT_BACKEND_PRODUCT_ALIASES.md`
- `docs/PROMPT_BACKEND_SUPPLIER_ALIASES.md`
