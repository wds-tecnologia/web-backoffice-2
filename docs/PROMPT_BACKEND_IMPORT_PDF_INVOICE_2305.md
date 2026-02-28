# Backend: Import PDF – Ajustes Invoice #2305

**Objetivo:** Corrigir dois problemas na extração da Invoice #2305 (PROCYON).

---

## ✅ Status: Implementado (Backend)

### 1. IPHONE 17 PRO MAX 256GB SILVER → "COR NÃO IDENTIFICADA"

**Alterações em `variant-expander.ts`:**
- **REGRA 1** passa a considerar produtos com cor no nome mesmo sem "NEW".
- Condição: `(hasNewInName || colorInName) && !hasP1P2P3`.
- Para `APPLE - IPHONE 17 PRO MAX 256GB SILVER`, a cor SILVER é extraída e mantida.
- O sufixo `(NEW)` é usado só quando o nome contém "NEW".

### 2. IPHONE 17 PRO 256GB ORANGE – 15 IMEIs

**Alterações:**
- **Cabeçalho repetido:** O parser ignora linhas de cabeçalho (SKU, PRODUCTS) no meio da DESCRIPTION e continua coletando IMEIs.
- **VARIANT_REGEX:** Suporte a quantidades com 3 dígitos (`\d{1,3}`), ex.: `15 ORANGE:`, `25 SILVER:`.
- **IMEIs após QTY RATE AMOUNT:** A coleta de IMEIs depois da linha de QTY RATE AMOUNT também é feita para produtos com cor no nome (não só "NEW").

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `variant-expander.ts` | REGRA 1 com cor no nome; pular cabeçalho de tabela; VARIANT_REGEX com 3 dígitos; sufixo (NEW) condicional |
| `product-extractor.ts` | Coletar IMEIs após QTY RATE AMOUNT para produtos com cor no nome |

---

## Problema original 1: APPLE - IPHONE 17 PRO MAX 256GB SILVER → "COR NÃO IDENTIFICADA"

**Problema:** O produto aparece como `APPLE - IPHONE 17 PRO MAX COR NÃO IDENTIFICADA` em vez de **SILVER**.

**Dados no PDF:**
- Nome: `APPLE - IPHONE 17 PRO MAX 256GB SILVER`
- Qty: 25, Rate: 1.300, Amount: 32.500
- Formato: cor já no nome (produto tipo NEW, não P2/P3)

**Esperado:** `name: "APPLE - IPHONE 17 PRO MAX 256GB SILVER"` (extrair cor do nome quando já estiver na coluna PRODUCTS).

---

## 2. APPLE - IPHONE 17 PRO 256GB ORANGE – IMEIs faltando

**Problema:** Produto com **15 unidades** mas só **4 IMEIs** extraídos. O front mostra alerta de divergência.

**Dados no PDF:** 15 ORANGE com 15 IMEIs correspondentes na DESCRIPTION.

**Causa provável:** O parser pode estar:
- Agrupando IMEIs incorretamente entre variantes
- Perdendo linhas de IMEI após "15 ORANGE:"
- Cortando a leitura antes de consumir todos os 15 IMEIs

**Esperado:** `quantity: 15` e `imeis.length: 15`.

---

## Resumo (histórico)

| Produto | Problema | Ação |
|---------|----------|------|
| IPHONE 17 PRO MAX 256GB | COR NÃO IDENTIFICADA | Extrair SILVER do nome (produto tipo NEW) |
| IPHONE 17 PRO 256GB ORANGE | 15 qty, 4 IMEIs | Corrigir extração para 15 IMEIs |

---

## Referências

- **Parser:** `import-pdf.ts`, `variant-expander.ts`, `product-extractor.ts`
- **Variantes:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
- **Nome/cor:** `docs/PROMPT_BACKEND_IMPORT_PDF_NOME_COR.md`
