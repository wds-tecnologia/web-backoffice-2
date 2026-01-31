# Backend: Sistema de Aliases de Produtos (Vínculo PDF → Banco)

**STATUS: ✅ IMPLEMENTADO**

Quando importamos PDFs de invoices, os produtos vêm com nomes em inglês ou códigos do fornecedor. Os **aliases** permitem salvar o vínculo entre o nome do PDF e um produto do banco; nas próximas importações o sistema reconhece automaticamente.

---

## Modelo de dados

**Tabela:** `product_alias` (Prisma: `ProductAlias`)

| Campo            | Tipo      | Descrição                              |
|------------------|-----------|----------------------------------------|
| id               | UUID      | Primary key                            |
| pdfProductName   | String    | Nome normalizado (trim + toLowerCase)  |
| productId        | UUID      | FK para Product                        |
| createdAt        | DateTime  | Data de criação                        |
| updatedAt        | DateTime  | Data de atualização                    |

- **UNIQUE** em `pdfProductName`.
- **INDEX** em `productId`.

---

## Endpoints

### 1. POST `/invoice/product/alias` – Criar/Atualizar Alias

**Body:**
```json
{
  "pdfProductName": "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB",
  "productId": "uuid-do-produto-no-banco"
}
```

**Resposta 200:**
```json
{
  "id": "uuid-do-alias",
  "pdfProductName": "i15pro256p2 apple - iphone 15 pro 256gb",
  "productId": "uuid-do-produto-no-banco",
  "productName": "iPhone 15 Pro 256GB",
  "createdAt": "2026-01-30T10:00:00Z"
}
```

- `pdfProductName` é normalizado (`trim().toLowerCase()`) antes de salvar.
- Se já existir alias para o mesmo `pdfProductName`, o `productId` é atualizado (upsert).

---

### 2. GET `/invoice/product/aliases` – Listar Aliases

**Resposta 200:**
```json
{
  "aliases": [
    {
      "id": "uuid-1",
      "pdfProductName": "i15pro256p2 apple - iphone 15 pro 256gb",
      "productId": "uuid-produto-1",
      "productName": "iPhone 15 Pro 256GB",
      "createdAt": "2026-01-30T10:00:00Z"
    }
  ]
}
```

---

### 3. DELETE `/invoice/product/alias/:id` – Remover Alias

**Resposta 200:**
```json
{
  "message": "Alias removido com sucesso"
}
```

**404:** Alias não encontrado.

---

## Integração em POST `/invoice/import-from-pdf`

1. Para cada produto extraído do PDF:
   - Normalizar nome: `product.name.trim().toLowerCase()`.
   - Buscar alias por `pdfProductName` (match exato).
2. Se encontrar alias:
   - `validation.exists = true`, `productId = alias.productId`.
   - `validation.matchedByAlias = true`, `validation.aliasId = alias.id`.
   - Divergências (nome, rate) calculadas em relação ao produto do banco.
3. Se não encontrar alias:
   - Comportamento atual: busca por SKU ou por nome (similaridade).

**Exemplo de validation com alias:**
```json
{
  "validation": {
    "exists": true,
    "productId": "uuid-do-produto",
    "divergences": [],
    "needsReview": false,
    "matchedByAlias": true,
    "aliasId": "uuid-do-alias"
  }
}
```

---

## Implementação

### Backend (✅ Feito)
- **Schema:** `prisma/schema.prisma` – model `ProductAlias`.
- **Controllers:** `src/http/controllers/invoices/products/alias/`  
  - `create-or-update.ts` – POST alias (upsert)  
  - `list.ts` – GET aliases  
  - `delete.ts` – DELETE alias por id  
- **Rotas:** em `src/http/controllers/invoices/routes.ts`
- **Import PDF:** `src/http/controllers/invoices/import-pdf.ts` – `findProductByAlias()`

### Frontend (✅ Feito)
- **ReviewPdfModal.tsx** e **MultiInvoiceReviewModal.tsx**:
  - Ao vincular produto, chama `POST /invoice/product/alias` para salvar o alias
  - Guarda `originalPdfName` no produto para usar no salvamento
  - Mostra botão "Auto" quando `validation.matchedByAlias === true`
  - Popup mostra nome original do PDF e mensagem de reconhecimento automático

---

## Fluxo Completo

```
1ª Importação:
┌─────────────────────────────────────────────────────────────┐
│ PDF: "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB"              │
│ → Backend: matchedByAlias = false (não encontrou alias)     │
│ → Frontend: mostra botão [Vincular]                         │
│ → Usuário vincula a "iPhone 15 Pro 256GB"                   │
│ → Frontend: POST /invoice/product/alias (salva o vínculo)   │
└─────────────────────────────────────────────────────────────┘

2ª Importação (mesmo produto):
┌─────────────────────────────────────────────────────────────┐
│ PDF: "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB"              │
│ → Backend: encontra alias! matchedByAlias = true            │
│ → Frontend: mostra botão [Auto] ✅                          │
│ → Usuário não precisa vincular novamente!                   │
└─────────────────────────────────────────────────────────────┘
```
