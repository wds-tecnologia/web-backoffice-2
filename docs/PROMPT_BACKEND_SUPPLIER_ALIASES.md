# Backend: Sistema de Aliases de Fornecedores (Vínculo PDF → Banco)

**STATUS: ✅ Implementado**

Similar ao ProductAlias, o **SupplierAlias** vincula o nome do fornecedor como aparece no PDF ao fornecedor cadastrado no sistema. O backend extrai o nome do fornecedor (linha após BILL TO / Sold To / Customer), busca em SupplierAlias e retorna `supplierId` em `invoiceData` na resposta de `POST /invoice/import-from-pdf`.

---

## Modelo de dados (backend)

**Tabela:** `supplier_alias` (Prisma: `SupplierAlias`)

| Campo            | Tipo     | Descrição                             |
|------------------|----------|---------------------------------------|
| id               | UUID     | Primary key                           |
| pdfSupplierName  | String   | Nome como vem no PDF (normalizado)    |
| supplierId       | UUID     | FK para Supplier                      |
| createdAt        | DateTime | Data de criação                       |
| updatedAt        | DateTime | Data de atualização                   |

- **UNIQUE** em `pdfSupplierName`.

---

## Endpoints (backend)

### POST `/invoice/supplier/alias` – Criar/Atualizar Alias

**Body:**
```json
{
  "pdfSupplierName": "DISTRIBUIDORA XYZ LTDA",
  "supplierId": "uuid-do-fornecedor"
}
```

### GET `/invoice/supplier/aliases` – Listar Aliases

**Resposta esperada:**
```json
{
  "aliases": [
    {
      "id": "uuid-1",
      "pdfSupplierName": "distribuidora xyz ltda",
      "supplierId": "uuid-fornecedor",
      "supplierName": "Distribuidora XYZ",
      "createdAt": "2026-01-30T10:00:00Z"
    }
  ]
}
```

### DELETE `/invoice/supplier/alias/:id` – Remover Alias

---

## Integração no frontend

- **SuppliersTab.tsx:** Seção "Vínculos (Aliases)" com:
  - Listagem de aliases
  - Formulário para criar novo vínculo (nome no PDF + fornecedor)
  - Botão para remover vínculo

---

## Import PDF (implementado)

- **extractInvoiceData():** extrai nome do fornecedor – primeira linha após BILL TO / Sold To / Customer (regex: `(?:BILL\s+TO|Sold\s+To|Customer)\s*:?\s*\r?\n\s*([^\r\n]+)`).
- **findSupplierIdByAlias(pdfSupplierName):** normaliza (trim().toLowerCase()) e busca em SupplierAlias; retorna supplierId ou null.
- **Resposta:** Após extrair invoiceData, se houver alias correspondente, `invoiceData.supplierId` é preenchido e incluído na resposta de `POST /invoice/import-from-pdf`.

**Frontend:**
- Usa `invoiceData.supplierId` quando presente; bloqueia o campo fornecedor (`_isSupplierFromPdf`) quando o fornecedor foi reconhecido pelo alias.
- Durante o import (ReviewPdfModal, MultiInvoiceReviewModal): quando `supplierId` **não** vem do backend, exibe seletor de fornecedor e input "Nome na nota". Ao vincular, chama `POST /invoice/supplier/alias` para salvar o vínculo.
- **Backend deve retornar** `invoiceData.pdfSupplierName` quando `supplierId` for null, para pré-preencher o nome e salvar o alias ao vincular.
