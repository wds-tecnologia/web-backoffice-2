# Prompts e Contratos do Backend

**Ponto único de entrada:** este documento lista os prompts e contratos do backend que o front deve usar. Para cada fluxo, use o doc indicado como referência.

---

## Índice por fluxo

| Fluxo | Documento(s) | Para que serve |
|-------|--------------|----------------|
| **Import PDF** | `docs/CONTRATO_FRONT_IMPORT_PDF.md` | O que o front deve fazer com a resposta do import; checklist. |
| | `docs/PROMPT_BACKEND_IMPORT_PDF.md` | Contrato completo do endpoint `POST /invoice/import-from-pdf`; resposta 200. |
| | `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md` | Variantes, cores, IMEIs; exemplos Print 2 vs Print 3. |
| **Histórico de recebimentos** | `PROMPT_BACKEND_HISTORICO_RECEBIMENTO.md` | Regras de histórico de recebimentos. |
| | `PROMPT_BACKEND_HISTORICO_RECEBIMENTO_COMPLETO.md` | Versão completa. |
| | `PROMPT_BACKEND_DEDUPLICACAO_HISTORICO_RECEBIMENTO.md` | Deduplicação. |
| **Sessão expirada** | Contrato implícito (401 → `/session-expired/backoffice`) | Tratamento de 401; fluxo de login. |
| **Listas de compras PUT** | `docs/PROMPT_BACKEND_SHOPPING_LISTS_PUT.md` | Contrato do PUT em listas de compras. |
| **Invoices / respostas ao front** | `docs/PROMPT_BACKEND_INVOICES_BUGS.md` | Erros e validações de invoices. |
| **IMEIs** | Em `docs/PROMPT_BACKEND_IMPORT_PDF.md` e `CONTRATO_FRONT_IMPORT_PDF.md` | Salvamento de IMEIs; divergências quantity vs imeis.length. |
| **Produtos perdidos** | `PROMPT_BACKEND_PRODUTOS_PERDIDOS*.md` | Vários docs de regras de produtos perdidos. |
| **Product/Supplier Aliases** | `docs/PROMPT_BACKEND_PRODUCT_ALIASES.md` | Aliases de produto. |
| | `docs/PROMPT_BACKEND_SUPPLIER_ALIASES.md` | Aliases de fornecedor. |

---

## Como usar

### Import de PDF (por onde começar)

1. Abra **`docs/CONTRATO_FRONT_IMPORT_PDF.md`** – contém o checklist do front.
2. Para detalhes do endpoint e da resposta: **`docs/PROMPT_BACKEND_IMPORT_PDF.md`**.
3. Para variantes, cores, IMEIs (Print 2 vs Print 3): **`docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`**.
4. Ao implementar ou ajustar o fluxo, siga o contrato e o checklist.

### Alinhamento com o backend

- Antes de mudar o fluxo de import ou o payload de criação de invoice, consulte `docs/CONTRATO_FRONT_IMPORT_PDF.md`.
- Se o backend alterar a API, atualize os docs em `docs/` e este índice.

---

## Checklist prático (Import PDF)

- [ ] Import PDF: fluxo que chama `POST /invoice/import-from-pdf` e trata a resposta conforme o contrato.
- [ ] Não usar `sku` da resposta do import; usar `validation.productId` para salvar.
- [ ] Quando `productId` for null, exigir vínculo do usuário antes de permitir salvar a invoice.
- [ ] Exibir `products` na ordem recebida (sem reordenar por nome/SKU/cor).
- [ ] Exibir o `name` como vem (com cor ou " COR NÃO IDENTIFICADA").
- [ ] Se `quantity` ≠ `imeis.length`, exibir alerta.
- [ ] Coluna SKU: ocultar ou mostrar "—" quando vazio.

**Referência:** `docs/CONTRATO_FRONT_IMPORT_PDF.md`.
