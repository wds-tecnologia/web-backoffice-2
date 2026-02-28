# Backend: Import PDF – Bugs ainda pendentes (Invoice #2305)

**Objetivo:** Corrigir problemas que **ainda ocorrem** após as implementações anteriores.

---

## 1. APPLE - IPHONE 17 PRO MAX 256GB SILVER – dois bugs

### Bug A: Nome continua "COR NÃO IDENTIFICADA"

**O que o backend retorna:**
```json
{
  "name": "APPLE - IPHONE 17 PRO MAX COR NÃO IDENTIFICADA",
  "quantity": 25,
  "rate": 1300,
  "description": "256GB SILVER\n358206131417124\n358206134675009\n..."
}
```

**Problema:** A `description` contém `"256GB SILVER"` na primeira linha – a cor está disponível. O `name` deveria ser `APPLE - IPHONE 17 PRO MAX 256GB SILVER`.

**Ação:** Extrair "SILVER" da description (ou do nome original do PDF) e montar o `name` corretamente.

---

### Bug B: "256GBSILVER" dentro do array `imeis`

**O que o backend retorna:**
```json
{
  "imeis": [
    "358206131417124",
    "358206134675009",
    ...
    "358206133973512",
    "256GBSILVER"   // ← ERRADO! Não é IMEI
  ]
}
```

**Problema:** O array `imeis` tem **26 itens** (25 IMEIs válidos + `"256GBSILVER"`). A linha `"256GB SILVER"` da description está sendo tratada como IMEI.

**Regra:** IMEIs devem ser **exatamente 15 dígitos numéricos**. Qualquer string que não seja `^\d{15}$` **não** deve entrar em `imeis`.

**Ação:** Filtrar o array `imeis` antes de retornar: incluir apenas strings que casem com `^\d{15}$`. Ou ajustar a lógica de coleta para não consumir linhas como "256GB SILVER" como IMEI.

---

## 2. Apple Watch – produtos não extraídos

**Produtos que deveriam aparecer (e não aparecem):**

| Produto | Qty | Rate | Serials |
|---------|-----|------|---------|
| APPLE - WATCH SE 3 40" STARLIGHT | 3 | 229 | SFRXMVT34XY, SFNNQY3430T, SLQ5HL6V21P |
| APPLE - WATCH SE 3 44" MIDNIGHT | 3 | 269 | SLWNYXH6F2T, SFM7YW67CNF, SDWLW6J547N |

**Formato no PDF:**
```
APPLE - WATCH SE 3 40"
STARLIGHT
SFRXMVT34XY
SFNNQY3430T
SLQ5HL6V21P
3 229.00 687.00

APPLE - WATCH SE 3 44"
MIDNIGHT
SLWNYXH6F2T
SFM7YW67CNF
SDWLW6J547N
3 269.00 807.00
```

**Problema:** Os 2 produtos Apple Watch **não aparecem** na resposta do import. O parser implementou suporte a serials alfanuméricos (ver `PROMPT_BACKEND_IMPORT_PDF_APPLE_WATCH.md`), mas na prática esses itens ainda não são extraídos.

**Ação:** Revisar o fluxo de extração para produtos `APPLE - WATCH` – garantir que esse formato (nome + cor em linha separada + serials) seja reconhecido e que os 2 produtos entrem no array `products`.

---

## Resumo

| Item | Problema | Ação |
|------|----------|------|
| PRO MAX SILVER | name = "COR NÃO IDENTIFICADA" | Extrair SILVER da description |
| PRO MAX SILVER | "256GBSILVER" em imeis | Filtrar: só `^\d{15}$` em imeis |
| Apple Watch 40" e 44" | Não extraídos | Garantir reconhecimento do formato Watch |

---

## Referências

- **Apple Watch:** `docs/PROMPT_BACKEND_IMPORT_PDF_APPLE_WATCH.md`
- **Invoice 2305:** `docs/PROMPT_BACKEND_IMPORT_PDF_INVOICE_2305.md`
- **Parser:** `variant-expander.ts`, `product-extractor.ts`, `imeis/utils.ts`
