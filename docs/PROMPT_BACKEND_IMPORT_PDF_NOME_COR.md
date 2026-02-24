# Backend: Import PDF – Corrigir nome do produto (cor e IMEI)

**Objetivo:** Ajustar o parser de PDF em `import-pdf.ts` para que o campo `name` dos produtos não contenha "COR NÃO IDENTIFICADA" quando a cor está disponível no PDF, e nunca inclua IMEI no nome.

---

## ✅ Status: Implementado (Backend)

As correções foram implementadas no backend. Resumo:

### 1. "COR NÃO IDENTIFICADA" quando a cor existe no PDF

**REGRA 3** (em `variant-expander.ts`): Para produtos **sem P2/P3** no nome (ex.: `APPLE - IPHONE 17 256GB`) que têm variantes na DESCRIPTION (`11 SAGE:`, `03 LAVENDER:`), o parser passa a:

- Ler linhas de variante na DESCRIPTION com o mesmo regex usado em P2/P3
- Expandir em um produto por cor (ex.: `11 SAGE` → `APPLE - IPHONE 17 256GB SAGE`)
- Agrupar IMEIs por variante

**Resultado:** Produtos como IPHONE 17 256GB com `11 SAGE:` e `03 LAVENDER:` na DESCRIPTION passam a gerar `APPLE - IPHONE 17 256GB SAGE` e `APPLE - IPHONE 17 256GB LAVENDER` em vez de "COR NÃO IDENTIFICADA".

### 2. IMEI no nome do produto

- Função **`removeImeisFromProductName`** adicionada em `variant-expander.ts` para remover sequências de 15 dígitos do nome
- Uso em **todos** os retornos do `expandProductByVariants`:
  - Produtos NEW
  - Produtos P2/P3 (com e sem variantes)
  - Produtos com cor no nome
  - Nova REGRA 3 (variantes na DESCRIPTION sem P2/P3)
  - Fallback "COR NÃO IDENTIFICADA"
- O `product-extractor.ts` já usava `removeImeisFromProductName` ao montar o produto; o `variant-expander` agora também aplica essa limpeza em todos os caminhos.

### Fluxo final

| Situação | Antes | Depois |
|----------|-------|--------|
| IPHONE 17 256GB com "11 SAGE:", "03 LAVENDER:" na DESCRIPTION | COR NÃO IDENTIFICADA | `APPLE - IPHONE 17 256GB SAGE` e `APPLE - IPHONE 17 256GB LAVENDER` |
| Nome com IMEI (ex.: ... 356305883123955 BLUE) | IMEI no nome | `APPLE - IPHONE 17 256GB BLUE` |

---

## Problemas observados (Invoice #2299 – PROCYON) – histórico

### 1. "COR NÃO IDENTIFICADA" quando a cor existe no PDF

**O que aparece:**
- `APPLE - IPHONE 17 256GB COR NÃO IDENTIFICADA` (11 unidades)
- `APPLE - IPHONE 17 256GB COR NÃO IDENTIFICADA` (3 unidades)

**O esperado:** A cor deveria ser extraída (ex.: SAGE, LAVENDER) conforme o layout do PDF. O usuário precisa vincular manualmente a "IPHONE 17 256GB SAGE" ou "IPHONE 17 256GB LAVENDER", mas o nome da nota não deveria ser genérico.

**Pergunta para o backend:**  
Em qual coluna/campo do PDF a cor aparece para esses produtos? Se for na coluna PRODUCTS (ex.: `APPLE - IPHONE 17 256GB SAGE`), o parser deve extrair a cor do nome. Se for na DESCRIPTION (ex.: `11 SAGE:` ou `11 LAVENDER:`), o parser deve usar `expandProductsByVariants` / `VARIANT_LINE_REGEX` para detectar. Se o layout for diferente (ex.: cor em outra linha ou formato), ajustar o regex ou a lógica de extração para não retornar "COR NÃO IDENTIFICADA" quando a cor estiver presente.

---

### 2. IMEI aparecendo no nome do produto

**O que aparece:**
- `APPLE - IPHONE 17 256GB 356305883123955 BLUE`

**O esperado:** `APPLE - IPHONE 17 256GB BLUE` (sem o IMEI no nome).

**Causa provável:** O parser está misturando o conteúdo da coluna DESCRIPTION (ou IMEI) com o nome do produto. O IMEI pode estar na mesma linha do produto (coluna PRODUCTS ou DESCRIPTION) ou em outra coluna, e o parser está concatenando incorretamente.

**Pergunta para o backend:**  
Em qual coluna do PDF aparece o IMEI `356305883123955`? Se for na mesma célula do nome do produto, o parser deve:
1. Detectar IMEIs (15 dígitos) e **remover** do nome antes de montar o `name`.
2. Colocar o IMEI apenas no array `imeis`, nunca em `name`.

**Sugestão de regex para remover IMEI do nome:**
```javascript
// Remover IMEIs (15 dígitos) e espaços extras do nome
name = name.replace(/\s*\d{15}\s*/g, ' ').replace(/\s+/g, ' ').trim();
```

---

## Resumo esperado

| Campo | Regra |
|-------|-------|
| `name` | Sempre modelo + cor (ex.: `APPLE - IPHONE 17 256GB SAGE`). Nunca incluir IMEI. Nunca retornar "COR NÃO IDENTIFICADA" se a cor estiver no PDF. |
| `imeis` | Array com os IMEIs extraídos da DESCRIPTION. Não misturar com o nome. |

---

## Referências

- **Parser atual:** `src/http/controllers/invoices/import-pdf.ts`
- **Variantes e regex:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
- **Contrato:** `docs/PROMPT_BACKEND_IMPORT_PDF.md`
