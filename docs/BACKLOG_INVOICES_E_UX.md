# Backlog: Importar Invoices e UX

Lista consolidada de melhorias e correções para o sistema de invoices e interface.

---

## Prioridade Alta (Bugs Críticos)

### 1. Erro: Foreign key constraint failed – InvoiceProduct productId
**Tipo:** Backend  
**Status:** ✅ Feito  
**Implementado:** Backend valida productId; busca por id/code (SKU); retorna 400 com `invalidProductIds` se inválido.

### 2. Erro: Supplier not found
**Tipo:** Backend / Frontend  
**Status:** ✅ Feito  
**Implementado:** Backend valida supplierId; retorna 400 com `message` e `supplierId`. Frontend trata e exibe detalhes.

### 3. IMEIs a mais ou a menos que produtos
**Tipo:** Backend (OCR/parser)  
**Status:** ✅ Feito  
**Implementado:** `expandProductsByVariants()`, VARIANT_LINE_REGEX, agrupamento de IMEIs por variante.

---

## Prioridade Alta (Funcionalidades)

### 4. Produtos com cores – separar como itens individuais
**Tipo:** Backend  
**Status:** ✅ Feito  
**Implementado:** `expandProductsByVariants()` separa por variante. Padrão: `05 BLACK:` + IMEIs, `05 NATURAL:` + IMEIs → 2 produtos.

### 5. Atualizar custo do produto ao salvar invoice
**Tipo:** Backend  
**Status:** ✅ Feito  
**Implementado:** Backend atualiza `Product.priceweightAverage` após `prisma.invoice.create` com o valor unitário da invoice.

### 6. Bloquear fornecedor, número e data quando vierem do PDF
**Tipo:** Frontend  
**Status:** ✅ Parcialmente implementado  
**Feito:** Número e data bloqueados quando vêm do PDF (`_isNumberFromPdf`, `_isDateFromPdf`). Fornecedor bloqueado quando `supplierId` vem do import (`_isSupplierFromPdf`).

---

## Prioridade Média

### 7. Editar produto na própria linha
**Tipo:** Frontend  
**Status:** ✅ Feito  
**Ação:** Ao clicar em "Editar", o formulário aparece inline na própria linha do produto (Produto, Qtd, Valor, Peso, Salvar, Cancelar).

### 8. Vincular fornecedor (como produto)
**Tipo:** Backend + Frontend  
**Status:** ✅ Feito  
**Backend:** Modelo `SupplierAlias` + endpoints (POST/GET/DELETE). Match no PDF: extrai nome após BILL TO/Sold To/Customer, busca em SupplierAlias, retorna `supplierId` em invoiceData.  
**Frontend:** Seção "Vínculos (Aliases)" na aba Fornecedores. Frontend usa `supplierId` do import quando presente.

---

## Prioridade Baixa (UX/Visual)

### 9. Cores mais claras e arredondadas (estilo iOS)
**Tipo:** Frontend  
**Status:** ✅ Feito  
**Ação:** Aplicado padrão iOS-like (rounded-2xl, cores mais claras, bordas suaves, shadow-sm) nas abas: Produtos, Fornecedores, Freteiros, Outros, Média Dólar, Relatórios, Produtos Perdidos, Buscar IMEI. Tabs com botões arredondados. Exceções: Invoices, Tokens, Operadores (já tinham efeito).

### 10. Deletar "Gerenciar planilhas"
**Tipo:** Frontend  
**Status:** ✅ Feito  
**Ação:** Removidos menu (Sidebar, Headerbar) e rotas. Código em `src/pages/spreadsheets/` mantido.

### 11. Deletar "Gerenciar boletos"
**Tipo:** Frontend  
**Status:** ✅ Feito  
**Ação:** Removidos menu (Sidebar, Headerbar) e rotas. Código em `src/pages/bills-management/` mantido.

---

## Resumo por Tipo

| Tipo      | Status |
|----------|--------|
| Backend  | Todos concluídos (1–8) |
| Frontend | Todos concluídos (6–11) |

---

## Referências

- Variantes/IMEIs: `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
- Aliases de produto: `docs/PROMPT_BACKEND_PRODUCT_ALIASES.md`
- Import PDF: `docs/PROMPT_BACKEND_IMPORT_PDF.md`
- Correções urgentes: `docs/FIXES_URGENTES.md`
