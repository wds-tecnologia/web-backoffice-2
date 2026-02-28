# Backend: Import PDF – Apple Watch e produtos com serial alfanumérico

**Objetivo:** Suporte a produtos Apple Watch (e similares) que usam **seriais alfanuméricos** em vez de IMEIs de 15 dígitos.

---

## ✅ Status: Implementado (Backend)

As correções foram implementadas no backend. Resumo:

### Resultado esperado (Invoice #2305)

| Produto | Qty | Rate | Serials |
|---------|-----|------|---------|
| APPLE - WATCH SE 3 40" STARLIGHT | 3 | 229 | SFRXMVT34XY, SFNNQY3430T, SLQ5HL6V21P |
| APPLE - WATCH SE 3 44" MIDNIGHT | 3 | 269 | SLWNYXH6F2T, SFM7YW67CNF, SDWLW6J547N |

### Formato no PDF

- **Linha 1:** Nome do produto (ex.: `APPLE - WATCH SE 3 40"`)
- **Linha 2:** Cor (STARLIGHT, MIDNIGHT)
- **Linhas 3–5:** Serials (um por linha)
- **Linha 6:** QTY RATE AMOUNT

### Implementação

1. **Detecção de produtos Apple:** Padrão ampliado para `APPLE - IPHONE` e `APPLE - WATCH` (`APPLE_PRODUCT_REGEX`)
2. **Seriais alfanuméricos:** Regex `^[A-Z0-9]{10,15}$` com pelo menos um dígito; excluídos do nome, incluídos em `imeis`
3. **Fluxo:** `product-extractor` (isSerialLine), `import-pdf` (filtro 10–15 chars), `imeis/utils` (extractImeisFromDescription), `variant-expander` (removeImeisFromProductName com serials)
4. **Arquivos alterados:** `product-extractor.ts`, `import-pdf.ts`, `imeis/utils.ts`, `variant-expander.ts`

---

## Problema original (Invoice #2305 – PROCYON)

**Produtos faltando na extração:**

| Produto | Qty | Rate | Amount | Serials (formato) |
|---------|-----|------|--------|-------------------|
| APPLE - WATCH SE 3 40" STARLIGHT | 3 | 229.00 | 687.00 | SFRXMVT34XY, SFNNQY3430T, SLQ5HL6V21P |
| APPLE - WATCH SE 3 44" MIDNIGHT | 3 | 269.00 | 807.00 | SLWNYXH6F2T, SFM7YW67CNF, SDWLW6J547N |

**Formato no PDF (coluna DESCRIPTION):**
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

---

## Causa provável

1. **IMEI vs Serial:** O parser atual espera **IMEIs de 15 dígitos numéricos**. O Apple Watch usa **seriais alfanuméricos** (ex.: `SFRXMVT34XY`, `SLQ5HL6V21P`) – caracteres e números.
2. **Formato diferente:** Pode não seguir o padrão `[QTD] [COR]:` + linhas de IMEI. A cor (STARLIGHT, MIDNIGHT) pode estar em linha separada e os serials listados diretamente.
3. **Produtos ignorados:** Se o parser só considera linhas que casam com IMEI 15 dígitos ou variante `NN COR:`, pode estar ignorando essas linhas.

---

## O que o backend deve fazer

### 1. Aceitar serials alfanuméricos (não só IMEI 15 dígitos)

- **IMEIs:** Manter suporte a 15 dígitos numéricos (celulares).
- **Serials:** Adicionar detecção de **seriais alfanuméricos** (ex.: `[A-Z0-9]{10,15}`) para Apple Watch e produtos similares.
- Armazenar no array `imeis` ou em campo específico (ex.: `serials`) – o front pode usar o mesmo campo para listar.

### 2. Detectar o formato Apple Watch

Exemplo de estrutura no PDF:
- **PRODUCTS:** `APPLE - WATCH SE 3 40"`
- **DESCRIPTION:** Linha com cor (STARLIGHT, MIDNIGHT) e, em seguida, uma serial por linha (alfanumérica).

O parser deve:
- Reconhecer linhas alfanuméricas como serials quando fizerem sentido no contexto (ex.: após nome/cor do produto).
- Não ignorar produtos cuja DESCRIPTION não contenha IMEIs de 15 dígitos.

### 3. Resultado esperado

```json
{
  "name": "APPLE - WATCH SE 3 40\" STARLIGHT",
  "quantity": 3,
  "rate": 229.00,
  "amount": 687.00,
  "imeis": ["SFRXMVT34XY", "SFNNQY3430T", "SLQ5HL6V21P"]
}
```

```json
{
  "name": "APPLE - WATCH SE 3 44\" MIDNIGHT",
  "quantity": 3,
  "rate": 269.00,
  "amount": 807.00,
  "imeis": ["SLWNYXH6F2T", "SFM7YW67CNF", "SDWLW6J547N"]
}
```

(O front usa `imeis` para qualquer identificador único – IMEI ou serial.)

---

## Sugestão de regex para serial alfanumérico

```regex
^[A-Z0-9]{10,15}$
```

Exemplos que devem ser reconhecidos como serial: `SFRXMVT34XY`, `SLQ5HL6V21P`, `SLWNYXH6F2T`.

Exemplos que **não** devem: `18 BLACK:`, `353431653115931` (IMEI – já tratado separadamente).

---

## Referências

- **Parser:** `src/http/controllers/invoices/import-pdf.ts`, `variant-expander.ts`, `product-extractor.ts`
- **Variantes e IMEIs:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`
- **Contrato:** `docs/PROMPT_BACKEND_IMPORT_PDF.md`
