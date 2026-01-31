# CRÍTICO: Ajustes no Parser de PDF

## Problema 1: Data não está sendo extraída

O campo DATE no PDF está no **formato americano** (MM/DD/YYYY) e não está sendo extraído/retornado.

**Exemplo do PDF:**
```
INVOICE # 2247
DATE 11/28/2025
DUE DATE 12/28/2025
TERMS Net 30
```

**Backend DEVE retornar:**
```json
{
  "invoiceData": {
    "number": "2247",
    "date": "2025-11-28"  // Convertido para ISO (YYYY-MM-DD)
  }
}
```

**Regex para extrair:**
```regex
DATE\s+(\d{1,2}\/\d{1,2}\/\d{4})
```

**Conversão:**
```javascript
const pdfDate = "11/28/2025";  // MM/DD/YYYY do PDF
const [month, day, year] = pdfDate.split('/');
const isoDate = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
// Resultado: "2025-11-28"
```

---

## Problema 2: Produtos com Variantes (Cores) devem vir SEPARADOS

## Problema Atual

O backend está **agregando** produtos com o mesmo SKU base em uma única linha, mas na verdade são **variantes diferentes** (cores) que precisam vir **separadas** no array de produtos.

### Exemplo do problema:

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

A coluna DESCRIPTION geralmente contém:
```
[QTD] [COR]
[IMEIs...]
[QTD] [COR]
[IMEIs...]
```

**Padrão regex para detectar variante:**
```regex
^(\d+)\s+(BLACK|WHITE|NATURAL|SILVER|GOLD|BLUE|PURPLE|GREEN|RED|PINK|GRAPHITE|TITANIUM|[A-Z]+)
```

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
  
  for (const line of lines) {
    // Detectar linha de variante (ex: "5 BLACK")
    const variantMatch = line.match(/^(\d+)\s+([A-Z]+)/);
    
    if (variantMatch) {
      // Salvar variante anterior se existir
      if (currentVariant) {
        variants.push({
          ...currentVariant,
          imeis: currentImeis
        });
      }
      
      // Iniciar nova variante
      const [_, qty, color] = variantMatch;
      currentVariant = {
        sku: `${pdfProduct.sku}_${color}`,
        name: `${pdfProduct.name} ${color}`,
        description: line,
        quantity: parseInt(qty),
        rate: pdfProduct.rate,
        amount: parseInt(qty) * pdfProduct.rate,
        imeis: [],
        validation: {
          exists: false,
          productId: null,
          divergences: []
        }
      };
      currentImeis = [];
    }
    // Detectar IMEI (15 dígitos)
    else if (line.match(/^\d{15}$/)) {
      currentImeis.push(line.trim());
    }
  }
  
  // Salvar última variante
  if (currentVariant) {
    variants.push({
      ...currentVariant,
      imeis: currentImeis
    });
  }
  
  // Se não encontrou variantes, retornar produto original
  return variants.length > 0 ? variants : [pdfProduct];
}
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
