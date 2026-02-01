# Backend: Importação de PDF de Invoice (single + em massa)

Objetivo: o front envia um ou mais PDFs de invoice; o backend parseia e devolve dados estruturados (número/data da invoice, produtos com quantidades/valores e **IMEIs** extraídos da coluna DESCRIPTION). O formato de referência é o da **Invoice 2272** (ex.: `public/Invoice 2272 (2).pdf`).

---

## Endpoint

- **POST** `/invoice/import-from-pdf`
- **Body:** `multipart/form-data` com campo **`file`** (um arquivo PDF por request).
- Para **em massa**, o front envia várias requisições (uma por arquivo). O backend continua recebendo um único `file` por chamada.

---

## Formato do PDF (modelo Invoice 2272)

### Cabeçalho

- **Remetente:** PROCYON TRADING & LOGISTICS, endereço, telefone, email, site.
- **INVOICE** (título).
- **BILL TO:** nome, RUC, endereço.
- **SHIP TO:** nome, transporte, endereço.
- **INVOICE #:** número da invoice (ex.: `2272`, `2247`).
- **DATE:** data no **formato americano MM/DD/YYYY** (ex.: `11/28/2025`, `01/09/2026`).
- **DUE DATE**, **TERMS** (opcionais para o parser).
- **SHIP DATE**, **SHIP VIA**, **TRACKING NO.** (ex.: `01/09/2026`, `FFW`, `EDSON`).

**⚠️ IMPORTANTE - Extração de DATA:**

O campo DATE no PDF vem no **formato americano** (MM/DD/YYYY). O backend DEVE:
1. Extrair a data do PDF (ex.: `11/28/2025`)
2. Converter para o formato ISO (YYYY-MM-DD) na resposta (ex.: `2025-11-28`)

**Regex sugerido para extrair:**
```regex
DATE\s+(\d{1,2}\/\d{1,2}\/\d{4})
```

**Exemplo de conversão:**
```javascript
// PDF mostra: DATE 11/28/2025
const pdfDate = "11/28/2025";  // MM/DD/YYYY
const [month, day, year] = pdfDate.split('/');
const isoDate = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
// Resultado: "2025-11-28"
```

### Tabela de produtos

Colunas:

| Coluna     | Conteúdo |
|-----------|----------|
| **SKU**   | Código do produto (ex.: `I14PRO128P2`, `I15128P2`). |
| **PRODUCTS** | Nome do produto (ex.: `APPLE - IPHONE 17 256GB BLACK`). |
| **DESCRIPTION** | Texto livre: linha de cor/quantidade (ex.: `20 BLACK`, `15 WHITE`, `06 SILVER`) e, nas linhas seguintes, **um IMEI por linha** (15 dígitos). Podem existir linhas como `***P2 A***` (ignorar na extração de IMEI). |
| **QTY**   | Quantidade (número). |
| **RATE**  | Preço unitário (ex.: `849.00`). |
| **AMOUNT**| Total da linha (ex.: `16,980.00`). |

Regras para **IMEIs** na DESCRIPTION:

- IMEI = sequência de **15 dígitos** (podem estar sozinhos na linha ou com espaços).
- Ignorar linhas que não forem só número (ex.: `20 BLACK`, `***P2 A***`).
- Ordem dos IMEIs na lista deve refletir a ordem no PDF.
- A quantidade de IMEIs por produto deve bater com **QTY** quando possível.

**⚠️ Ordem dos produtos na resposta:**

Os produtos retornados em `products` **devem vir na ordem original da invoice** (ordem em que aparecem no PDF), **não em ordem alfabética**. O front exibe na ordem recebida; a nota deve ser fiel à sequência da invoice.

---

## ⚠️ CRÍTICO - Produtos com Variantes (Cores)

Quando a DESCRIPTION contém **múltiplas variantes** (ex: "5 BLACK" + "5 NATURAL"), o backend **DEVE** retornar produtos **SEPARADOS** no array, não agregados.

📄 **Ver documentação completa:** `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md`

### Exemplo de produto com variantes:

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

**Backend retorna 2 produtos** (não 1 com qty 10). **SKU não é mais preenchido no import** (`sku: ""` em todos):

```json
{
  "products": [
    {
      "sku": "",
      "name": "APPLE - IPHONE 16 PRO 128GB BLACK",
      "description": "5 BLACK",
      "quantity": 5,
      "rate": 690.00,
      "amount": 3450.00,
      "imeis": ["353000000000001", "353000000000002", "353000000000003", "353000000000004", "353000000000005"],
      "validation": { "exists": false, "productId": null, "divergences": [] }
    },
    {
      "sku": "",
      "name": "APPLE - IPHONE 16 PRO 128GB NATURAL",
      "description": "5 NATURAL",
      "quantity": 5,
      "rate": 690.00,
      "amount": 3450.00,
      "imeis": ["353000000000006", "353000000000007", "353000000000008", "353000000000009", "353000000000010"],
      "validation": { "exists": false, "productId": null, "divergences": [] }
    }
  ]
}
```

**Benefícios:**
- ✅ Cada cor pode ser vinculada a um produto diferente no banco
- ✅ Validação de IMEI funciona corretamente (5 IMEIs = 5 unidades)
- ✅ Sistema de aliases funciona por cor
- ❌ Se não separar: impossível vincular corretamente, IMEIs misturados, validação falha

---

## Resposta esperada (200)

O front espera este formato. **SKU não é mais preenchido no import** (backend retorna `sku: ""` em todos os produtos).

```json
{
  "invoiceData": {
    "number": "2272",
    "date": "2026-01-09",
    "emails": ["omar@procyonusa.com"]
  },
  "products": [
    {
      "sku": "",
      "name": "APPLE - IPHONE 17 256GB BLACK",
      "description": "20 BLACK",
      "quantity": 20,
      "rate": 849.00,
      "amount": 16980.00,
      "imeis": ["354780907895774", "354780909633892"],
      "validation": {
        "exists": false,
        "productId": null,
        "divergences": [],
        "needsReview": false
      }
    }
  ],
  "summary": {
    "totalProducts": 3,
    "existingProducts": 0,
    "newProducts": 3,
    "productsWithDivergences": 0
  }
}
```

### Campos obrigatórios

- **invoiceData.number** (string): número da invoice (ex.: `"2272"`). Vazio se não extraído.
- **invoiceData.date** (string): data em **YYYY-MM-DD** (ex.: `"2026-01-09"`). Vazio se não extraído.
- **invoiceData.emails** (array de strings): emails extraídos do cabeçalho (pode ser `[]`).
- **products** (array): um item por linha de produto (ou por variante), **na ordem original da invoice** (sem ordenação alfabética).
  - **sku** (string): **não é mais preenchido no import**; o backend retorna sempre `""`. O front remove ou exibe como quiser (ex.: tirar da linha do nome se vier junto).
  - **name** (string): nome do produto (coluna PRODUCTS, fiel ao PDF; variantes recebem `" NOME COR"`). Pode vir com código na frente (ex.: `I15128P2 APPLE - IPHONE 15 128GB P2`); o front trata/remove se desejar.
  - **description** (string): texto bruto da DESCRIPTION ou resumo (ex.: `"20 BLACK"`).
  - **quantity** (number): da coluna QTY (ou quantidade da variante).
  - **rate** (number): da coluna RATE.
  - **amount** (number): da coluna AMOUNT (ou recalculado se variante).
  - **imeis** (array de strings): IMEIs extraídos da DESCRIPTION (15 dígitos cada).
  - **validation** (objeto): pelo menos `{ "exists": boolean, "productId": string | null, "divergences": [] }`; **needsReview** opcional.
- **summary**: `totalProducts`, `existingProducts`, `newProducts`, `productsWithDivergences` (números).

---

## Checagem de número duplicado (obrigatório)

Para não baixar a lista inteira de invoices só para validar um número, o front usa um endpoint dedicado:

- **GET** `/invoice/exists-by-number?number=2272`
- **Query:** `number` (string) — número da invoice a verificar (ex.: `2272`).
- **Resposta 200:** `{ "exists": true }` ou `{ "exists": false }`.
- **Regra:** comparação no backend deve ser por número normalizado (trim, case-insensitive). Retornar `exists: true` se já existir alguma invoice com esse número.

---

## Erros

- **400:** PDF inválido ou não suportado → body com `message` (ex.: "Formato de PDF não reconhecido").
- **404:** Não usar para "endpoint não existe"; o front trata 404 como "backend desatualizado".
- **413:** Arquivo muito grande (opcional).
- **500:** Erro interno → body com `message` quando possível.

---

## Exemplo de texto extraído do PDF (referência)

```
INVOICE # 2272
DATE 01/09/2026
...
SHIP DATE 01/09/2026  SHIP VIA FFW  TRACKING NO. EDSON

SKU   PRODUCTS                        DESCRIPTION     QTY   RATE     AMOUNT
      APPLE - IPHONE 17 256GB BLACK   20 BLACK        20    849.00   16,980.00
                                      354780907895774
                                      354780909633892
                                      ...
      APPLE - IPHONE 17 256GB WHITE   15 WHITE        15    849.00   12,735.00
                                      354780909132143
                                      ...
```

O parser deve identificar número da invoice, data, e para cada produto: SKU, nome, quantidade, rate, amount e todas as linhas de 15 dígitos (IMEIs) dentro da DESCRIPTION. **Se houver múltiplas cores no mesmo produto, separar em múltiplos produtos no array.**

---

## Fluxo no front (resumo)

1. Usuário clica em **Importar em Massa** e seleciona um ou vários PDFs.
2. Para cada PDF, o front chama **POST /invoice/import-from-pdf** com `file` no FormData.
3. **Um PDF:** abre o modal de revisão único; ao confirmar, os dados são mergeados na invoice da tela e o usuário salva depois pelo botão "Salvar Invoice".
4. **Dois ou mais PDFs:** abre o modal com **abas** (estilo Excel), uma aba por invoice. Em cada aba o usuário revisa/edita e clica em **"Salvar esta Invoice"**. O front chama **POST /invoice/create** para aquela invoice (número, data, produtos; fornecedor/carrier vêm da tela principal) e, em seguida, **POST /invoice/imeis/save** para cada produto que tiver IMEIs. A aba fica **verde** (salva). O modal só pode ser fechado quando **todas** as abas estiverem salvas.
5. **Onde vão os IMEIs:** após cada **POST /invoice/create** (tanto no fluxo de 1 PDF quanto no de abas), o front envia os IMEIs de cada produto da invoice para **POST /invoice/imeis/save** (`invoiceProductId` = id do item criado, `imeis` = array de strings). Nenhuma mudança de contrato no back: continuam os mesmos endpoints.

Com isso, backend e front ficam alinhados para o recebedor de PDF (single e em massa com abas).
