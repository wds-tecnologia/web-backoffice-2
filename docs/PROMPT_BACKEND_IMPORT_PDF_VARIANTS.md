# Parser de PDF – Data e Variantes

## Status Atual (Backend)

| Item | Status | Onde |
|------|--------|------|
| Data MM/DD/YYYY → YYYY-MM-DD | ✅ Corrigido | `import-pdf.ts` – `extractInvoiceData()` |
| Detectar padrão [QTD] [COR]: | ✅ Corrigido | `VARIANT_LINE_REGEX` + `expandProductByVariants()` |
| Separar cada variante em um produto | ✅ Corrigido | `expandProductByVariants()` |
| Agrupar IMEIs por variante | ✅ Corrigido | Consumo de linhas 15 dígitos após cada linha de variante |

---

## BUG 1: Data com dia/mês invertidos – ✅ CORRIGIDO

**Problema (resolvido):** PDF em MM/DD/YYYY (ex.: `11/28/2025` = 28 Nov 2025) era retornado como `"2025-28-11"` (YYYY-DD-MM) em vez de `"2025-11-28"` (YYYY-MM-DD).

**Correção em** `src/http/controllers/invoices/import-pdf.ts` (função `extractInvoiceData`):

- O PDF usa **MM/DD/YYYY** (formato US).
- O código interpreta os três segmentos como `[month, day, year]` e monta a saída em **YYYY-MM-DD** (ISO 8601):

```javascript
const [month, day, year] = dateMatch[1].split("/")
invoiceData.date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
```

**Resultado:** `DATE 11/28/2025` no PDF → resposta `"2025-11-28"` ✅

---

## BUG 2: Separação por cor/variante – ✅ CORRIGIDO

**Problema (resolvido):** Uma linha do PDF com várias cores (ex.: 5 BLACK + 5 NATURAL) era retornada como um único produto com todos os IMEIs juntos.

**Correção em** `src/http/controllers/invoices/import-pdf.ts`:

1. **Padrão de variante:** `^\s*(\d{1,2})\s+([A-Za-z]+):?\s*(\d{15})?\s*$`
2. **Função `expandProductByVariants(product)`:** Separa cada variante em um produto, agrupa IMEIs por variante.
3. **Fluxo:** Após `extractProducts(text)`, chama `expandProductsByVariants()`; em seguida preenche IMEIs e valida.

**Resultado:** Uma linha do PDF com "05 BLACK:" + 5 IMEIs + "05 NATURAL:" + 5 IMEIs → **2 produtos** no array, cada um com seus 5 IMEIs ✅

---

## Documentação de Referência (para manutenção futura)

### Problema Original (agregando variantes)

**PDF mostra:**
```
SKU: I16PRO128P2
PRODUCTS: APPLE - IPHONE 16 PRO 128GB
DESCRIPTION: 
  5 BLACK
  353000000000001
  353000000000002
  353000000000003
  353000000000004
  353000000000005
  5 NATURAL
  353000000000006
  353000000000007
  353000000000008
  353000000000009
  353000000000010
QTY: 10
RATE: 690.00
AMOUNT: 6900.00
```

**Backend está retornando (ERRADO ❌):**
```json
{
  "products": [
    {
      "sku": "I16PRO128P2",
      "name": "APPLE - IPHONE 16 PRO 128GB",
      "quantity": 10,
      "rate": 690.00,
      "amount": 6900.00,
      "imeis": [
        "353000000000001", "353000000000002", "353000000000003",
        "353000000000004", "353000000000005", "353000000000006",
        "353000000000007", "353000000000008", "353000000000009",
        "353000000000010"
      ]
    }
  ]
}
```

**Problema:** 
- 1 linha com 10 unidades, mas são **2 produtos diferentes** (BLACK e NATURAL)
- Impossível vincular corretamente no banco (cada cor é um produto separado)
- IMEIs estão todos juntos, não separados por variante

---

## Solução: Separar por Variante

**Backend DEVE retornar (CORRETO ✅):**
```json
{
  "products": [
    {
      "sku": "I16PRO128P2_BLACK",
      "name": "APPLE - IPHONE 16 PRO 128GB BLACK",
      "description": "5 BLACK",
      "quantity": 5,
      "rate": 690.00,
      "amount": 3450.00,
      "imeis": [
        "353000000000001",
        "353000000000002",
        "353000000000003",
        "353000000000004",
        "353000000000005"
      ],
      "validation": {
        "exists": false,
        "productId": null,
        "divergences": []
      }
    },
    {
      "sku": "I16PRO128P2_NATURAL",
      "name": "APPLE - IPHONE 16 PRO 128GB NATURAL",
      "description": "5 NATURAL",
      "quantity": 5,
      "rate": 690.00,
      "amount": 3450.00,
      "imeis": [
        "353000000000006",
        "353000000000007",
        "353000000000008",
        "353000000000009",
        "353000000000010"
      ],
      "validation": {
        "exists": false,
        "productId": null,
        "divergences": []
      }
    }
  ]
}
```

---

## Regras para o Backend

### 1. Detectar Variantes na DESCRIPTION

**FORMATO REAL DO PDF (baseado em exemplo):**

O PDF real mostra na coluna DESCRIPTION:
```
05 BLACK:
353431653115931
353171924675855
353431651632556
350839530691366
351188224577153
05 NATURAL:
355407366677175
353171927583023
352400475824013
355407369839566
353864166921157
```

**Observações importantes:**
1. Formato é `[QTD 2 dígitos] [COR]:` (com dois pontos no final)
2. Primeiro IMEI pode estar na mesma linha do variante ou na próxima
3. Os IMEIs são 15 dígitos numéricos

**Padrão regex para detectar variante:**
```regex
^(\d{2})\s+([A-Z]+):\s*(\d{15})?
```

Exemplo: `"05 BLACK:"` captura:
- Grupo 1: `05` (quantidade)
- Grupo 2: `BLACK` (cor)
- Grupo 3: pode ter um IMEI na mesma linha ou não

### 2. Agrupar IMEIs por Variante

Para cada linha que casou o padrão:
1. Capturar quantidade (ex: `5`)
2. Capturar cor (ex: `BLACK`)
3. Capturar os próximos N IMEIs (onde N = quantidade)

### 3. Criar um Produto por Variante

Para cada variante encontrada:
- `sku`: SKU base + `_` + COR (ex: `I16PRO128P2_BLACK`)
- `name`: Nome base + ` ` + COR (ex: `APPLE - IPHONE 16 PRO 128GB BLACK`)
- `description`: Apenas a linha da variante (ex: `5 BLACK`)
- `quantity`: Quantidade específica da variante (ex: `5`)
- `rate`: Rate original (mesmo para todas as variantes)
- `amount`: `quantity * rate` (recalculado por variante)
- `imeis`: Array com os IMEIs **apenas dessa variante**

### 4. Validação

✅ **CORRETO:**
- Quantidade de IMEIs = Quantidade da variante
- Cada variante é um item separado no array
- IMEIs não se repetem entre variantes

❌ **ERRADO:**
- Agregar variantes em um único item
- IMEIs misturados de diferentes cores
- Quantidade total sem separar por cor

---

## Casos de Uso

### Caso 1: Produto com 2 cores
```
SKU: I15128P2
PRODUCTS: APPLE - IPHONE 15 128GB
DESCRIPTION:
  10 BLACK
  [10 IMEIs...]
  8 WHITE
  [8 IMEIs...]
QTY: 18
```

**Retornar:** 2 produtos separados (10 BLACK + 8 WHITE)

---

### Caso 2: Produto sem variantes
```
SKU: CASE001
PRODUCTS: CASE SILICONE UNIVERSAL
DESCRIPTION:
  50 units
QTY: 50
```

**Retornar:** 1 produto (não tem cor/variante)

---

### Caso 3: Produto com 3+ cores
```
SKU: I14PRO256P2
PRODUCTS: APPLE - IPHONE 14 PRO 256GB
DESCRIPTION:
  5 BLACK
  [5 IMEIs...]
  3 SILVER
  [3 IMEIs...]
  2 GOLD
  [2 IMEIs...]
QTY: 10
```

**Retornar:** 3 produtos separados (5 BLACK + 3 SILVER + 2 GOLD)

---

## Algoritmo Sugerido

```javascript
function parseProductVariants(pdfProduct) {
  const variants = [];
  const lines = pdfProduct.description.split('\n');
  
  let currentVariant = null;
  let currentImeis = [];
  
  // Regex para detectar linha de variante: "05 BLACK:" ou "05 BLACK: 353431653115931"
  const variantRegex = /^(\d{1,2})\s+([A-Z]+):\s*(\d{15})?/i;
  // Regex para detectar IMEI (15 dígitos)
  const imeiRegex = /^(\d{15})$/;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const variantMatch = trimmedLine.match(variantRegex);
    
    if (variantMatch) {
      // Salvar variante anterior se existir
      if (currentVariant) {
        currentVariant.imeis = currentImeis;
        variants.push(currentVariant);
      }
      
      // Iniciar nova variante
      const qty = parseInt(variantMatch[1], 10);
      const color = variantMatch[2].toUpperCase();
      const firstImei = variantMatch[3]; // Pode ser undefined
      
      currentVariant = {
        sku: `${pdfProduct.sku}_${color}`,
        name: `${pdfProduct.name} ${color}`,
        description: `${qty} ${color}`,
        quantity: qty,
        rate: pdfProduct.rate,
        amount: qty * pdfProduct.rate,
        imeis: [],
        validation: {
          exists: false,
          productId: null,
          divergences: []
        }
      };
      currentImeis = firstImei ? [firstImei] : [];
    }
    // Detectar IMEI (15 dígitos) - linha com só o IMEI
    else if (imeiRegex.test(trimmedLine)) {
      currentImeis.push(trimmedLine);
    }
    // Também detectar IMEI no meio do texto
    else {
      const imeiMatch = trimmedLine.match(/(\d{15})/g);
      if (imeiMatch) {
        currentImeis.push(...imeiMatch);
      }
    }
  }
  
  // Salvar última variante
  if (currentVariant) {
    currentVariant.imeis = currentImeis;
    variants.push(currentVariant);
  }
  
  // Se não encontrou variantes, retornar produto original
  return variants.length > 0 ? variants : [pdfProduct];
}
```

### Exemplo de Input/Output:

**Input (description do produto):**
```
05 BLACK:
353431653115931
353171924675855
353431651632556
350839530691366
351188224577153
05 NATURAL:
355407366677175
353171927583023
352400475824013
355407369839566
353864166921157
```

**Output esperado:**
```json
[
  {
    "sku": "I15PRO256P2_BLACK",
    "name": "APPLE - IPHONE 15 PRO 256GB P2 BLACK",
    "quantity": 5,
    "imeis": ["353431653115931", "353171924675855", "353431651632556", "350839530691366", "351188224577153"]
  },
  {
    "sku": "I15PRO256P2_NATURAL",
    "name": "APPLE - IPHONE 15 PRO 256GB P2 NATURAL",
    "quantity": 5,
    "imeis": ["355407366677175", "353171927583023", "352400475824013", "355407369839566", "353864166921157"]
  }
]
```

---

## Impacto no Frontend

✅ **Frontend JÁ ESTÁ PREPARADO**:
- Cada variante aparecerá como uma linha separada
- Usuário pode vincular cada cor a um produto diferente no banco
- Validação de IMEI funcionará corretamente (5 IMEIs para 5 BLACK, 5 IMEIs para 5 NATURAL)
- Sistema de aliases salvará vínculo por cor (ex: "I16PRO128P2 BLACK" → Produto A, "I16PRO128P2 NATURAL" → Produto B)

❌ **Se não separar:**
- Usuário não consegue vincular corretamente
- IMEIs ficam misturados
- Validação falha (10 produtos != 10 IMEIs quando são 2x5)

---

## Prioridade

🔴 **CRÍTICO** - Sem isso, o sistema de importação não funciona corretamente para produtos com variantes (que é o caso mais comum de iPhones/Samsungs).

---

## Exemplo Real: DESCRIPTION com 5 variantes

Segue um **exemplo real** de como a coluna DESCRIPTION aparece no PDF e como deve ser separada.

### Visão rápida: separação (o que você vê na DESCRIPTION)

```
┌─ Produto 1 ───────────────────────────────┐
│ 08 BLACK:                                 │
│ 359954314115887                           │
│ 352404326401500                           │
│ 355616950757660                           │
│ 352306399178479                           │
│ 359954314761045                           │
│ 350340255918027                           │
│ 354563837571768                           │
│ 357189983013632                           │  ← 8 IMEIs
└───────────────────────────────────────────┘

┌─ Produto 2 ───────────────────────────────┐
│ 07 ULTRAMARINE:                           │
│ 353685838103613                           │
│ 356166895648011                           │
│ 357189989303359                           │
│ 359206282759216                           │
│ 356140778642979                           │
│ 354563832891732                           │
│ 351935561858608                           │  ← 7 IMEIs
└───────────────────────────────────────────┘

┌─ Produto 3 ───────────────────────────────┐
│ 03 TEAL:                                  │
│ 351582370778211                           │
│ 351582370720676                           │
│ 351935561150220                           │  ← 3 IMEIs
└───────────────────────────────────────────┘

┌─ Produto 4 ───────────────────────────────┐
│ 02 STARLIGHT:                             │
│ 353685838211325                           │
│ 353685837780296                           │  ← 2 IMEIs
└───────────────────────────────────────────┘

┌─ Produto 5 ───────────────────────────────┐
│ 02 PINK:                                  │
│ 357004285459302                           │
│ 351698476259425                           │  ← 2 IMEIs
└───────────────────────────────────────────┘

Total: 5 produtos, 22 IMEIs
```

### Texto bruto na DESCRIPTION (como vem do PDF)

```
08 BLACK:
359954314115887
352404326401500
355616950757660
352306399178479
359954314761045
350340255918027
354563837571768
357189983013632
07 ULTRAMARINE:
353685838103613
356166895648011
357189989303359
359206282759216
356140778642979
354563832891732
351935561858608
03 TEAL:
351582370778211
351582370720676
351935561150220
02 STARLIGHT:
353685838211325
353685837780296
02 PINK:
357004285459302
351698476259425
```

### Regra de separação

| Linha              | Tipo      | Ação                                           |
|--------------------|-----------|------------------------------------------------|
| `08 BLACK:`        | Variante  | Inicia produto 1: qty=8, cor=BLACK             |
| `359954314115887`  | IMEI      | Adiciona ao produto 1 (1/8)                    |
| ... (8 linhas)     | IMEI      | Produto 1 completa 8 IMEIs                     |
| `07 ULTRAMARINE:`  | Variante  | Inicia produto 2: qty=7, cor=ULTRAMARINE       |
| ... (7 linhas)     | IMEI      | Produto 2 completa 7 IMEIs                     |
| `03 TEAL:`         | Variante  | Inicia produto 3: qty=3, cor=TEAL              |
| ... (3 linhas)     | IMEI      | Produto 3 completa 3 IMEIs                     |
| `02 STARLIGHT:`    | Variante  | Inicia produto 4: qty=2, cor=STARLIGHT         |
| ... (2 linhas)     | IMEI      | Produto 4 completa 2 IMEIs                     |
| `02 PINK:`         | Variante  | Inicia produto 5: qty=2, cor=PINK              |
| ... (2 linhas)     | IMEI      | Produto 5 completa 2 IMEIs                     |

### Resultado esperado (5 produtos separados)

| # | Variante   | Qtd | IMEIs                                                                 |
|---|------------|-----|-----------------------------------------------------------------------|
| 1 | BLACK      | 8   | 359954314115887, 352404326401500, 355616950757660, 352306399178479, 359954314761045, 350340255918027, 354563837571768, 357189983013632 |
| 2 | ULTRAMARINE| 7   | 353685838103613, 356166895648011, 357189989303359, 359206282759216, 356140778642979, 354563832891732, 351935561858608 |
| 3 | TEAL       | 3   | 351582370778211, 351582370720676, 351935561150220                     |
| 4 | STARLIGHT  | 2   | 353685838211325, 353685837780296                                     |
| 5 | PINK       | 2   | 357004285459302, 351698476259425                                     |

**Total:** 5 produtos, 22 IMEIs (8+7+3+2+2).

### Padrão regex para variante

```
^\s*(\d{1,2})\s+([A-Za-z]+):?\s*(\d{15})?\s*$
```

- Grupo 1: quantidade (08, 07, 03, 02, 02)
- Grupo 2: cor (BLACK, ULTRAMARINE, TEAL, STARLIGHT, PINK)
- Grupo 3: IMEI opcional na mesma linha

---

## Casos que ainda falham (backend precisa ajustar)

Estes são **exemplos reais** de produtos que aparecem com IMEIs inconsistentes após o import. O backend está retornando `quantity ≠ imeis.length` para vários itens.

### Exemplos capturados em produção

| Produto (nome retornado) | IMEIs | Qtd | Problema |
|--------------------------|-------|-----|----------|
| I15128P2 APPLE - IPHONE 15 128GB P2 02 PINK: BLACK: | 1 | 5 | Nome malformado (02 PINK: + BLACK:); IMEIs insuficientes |
| I15PRO256P2 APPLE - IPHONE 15 PRO 256GB BLACK: | 1 | 5 | 1 IMEI para 5 unidades – variantes não separadas ou IMEIs perdidos |
| I16PRO256P2 APPLE - IPHONE 16 PRO 256GB WHITE: | 2 | 5 | 2 IMEIs para 5 unidades |
| MTP13HN/A APPLE - iPHONE 15 128GB PINK NEW:: | 24 | 5 | 24 IMEIs para 5 – IMEIs de várias variantes agregados em um produto |
| APPLE - iPHONE 15 128GB: | 12 | 5 | 12 IMEIs para 5 – provável agregação indevida |
| APPLE - IPHONE 17 PRO 256GB: | 9 | 7 | 9 IMEIs para 7 |
| MG7M4LL/A APPLE - IPHONE 17 PRO 256GB: | 11 | 2 | 11 IMEIs para 2 – excesso de IMEIs |
| APPLE - IPHONE 17 PRO 256GB: | 11 | 9 | 11 IMEIs para 9 |
| A3257 APPLE - iPHONE 17 PRO MAX: | 2 | 13 | 2 IMEIs para 13 – faltam 11 IMEIs |
| 195950638028 APPLE - IPHONE 17 PRO MAX: | 18 | 8 | 18 IMEIs para 8 – excesso de IMEIs |

### Possíveis causas

1. **Nome malformado** (ex.: "02 PINK: BLACK:" no nome): variantes concatenadas incorretamente no campo `name`.
2. **IMEIs insuficientes**: variantes separadas, mas IMEIs atribuídos só à primeira; ou regex de variante não detectando todas.
3. **IMEIs em excesso**: várias variantes agregadas em um único produto, com IMEIs de todas somados.
4. **Formato diferente do PDF**: layout ou estrutura da DESCRIPTION que a regex atual não cobre (ex.: "PINK NEW::" com dois pontos, SKU com muitos dígitos).

### Ação sugerida no backend

- Revisar `expandProductsByVariants()` e o fluxo de atribuição de IMEIs para esses casos.
- Incluir logs/tests com esses exemplos reais.
- Validar regex para formatos alternativos (ex.: "NEW::", variantes em linhas diferentes).
