# 🔧 Correção Necessária - Duplicação de Registros no Histórico de Recebimento

## Problema

O endpoint `GET /invoice/product/receipt-history/:invoiceProductId` está retornando registros duplicados quando múltiplos produtos são recebidos ao mesmo tempo ou quando há recebimentos muito próximos no tempo.

### Sintomas

- Mesmo recebimento aparece 2 ou mais vezes no histórico
- Registros com segundos de diferença (ex: 08:29:50 e 08:30:28)
- Mesma invoice, mesma quantidade, mesmos produtos
- Um registro tem operador, outro não (sugere duplicação no banco)

### Exemplo do Problema

```json
{
  "all": [
    {
      "date": "2026-01-03T08:29:50Z",
      "quantity": 2,
      "invoiceNumber": "2248",
      "user": { "name": "Black Rabbit Adm3" }
    },
    {
      "date": "2026-01-03T08:30:28Z",
      "quantity": 2,
      "invoiceNumber": "2248",
      "user": null
    }
  ]
}
```

## Possíveis Causas

### 1. Múltiplas Chamadas ao Endpoint de Criação

Se o recebimento em lote faz múltiplas chamadas a `POST /invoice/product/receipt-history` para o mesmo produto, cada chamada cria um registro separado.

**Solução sugerida:**
- Verificar se já existe um registro recente (últimos 5 minutos) com os mesmos dados antes de criar
- Ou usar transação e `upsert` ao invés de `create`

### 2. Recebimento em Lote Criando Registros Duplicados

Quando múltiplos produtos são recebidos ao mesmo tempo, pode estar criando um registro para cada produto, mesmo que seja o mesmo recebimento.

**Solução sugerida:**
- Agrupar recebimentos do mesmo usuário no mesmo timestamp
- Ou usar um único registro de histórico que referencia múltiplos produtos

### 3. Race Condition

Se há múltiplas requisições simultâneas, pode haver race condition criando múltiplos registros.

**Solução sugerida:**
- Usar transações com isolamento adequado
- Implementar lock ou verificação de existência antes de criar

## Solução Recomendada

### Opção 1: Deduplicação no Backend (Recomendado)

No endpoint `POST /invoice/product/receipt-history`, antes de criar um novo registro:

```typescript
// Verificar se já existe um registro similar nos últimos 5 minutos
const existingRecord = await prisma.receiptHistory.findFirst({
  where: {
    invoiceProductId: body.invoiceProductId,
    quantity: body.quantity,
    date: {
      gte: new Date(Date.now() - 5 * 60 * 1000), // Últimos 5 minutos
      lte: new Date()
    }
  }
});

if (existingRecord) {
  // Retornar o registro existente ao invés de criar novo
  return existingRecord;
}

// Criar novo registro apenas se não existir
const newRecord = await prisma.receiptHistory.create({...});
```

### Opção 2: Usar Upsert com Chave Única

Criar uma constraint única ou usar `upsert` baseado em uma combinação de campos:

```typescript
const receiptHistory = await prisma.receiptHistory.upsert({
  where: {
    // Combinar invoiceProductId + date (arredondado) + quantity
    unique_receipt: {
      invoiceProductId: body.invoiceProductId,
      date: roundToMinute(body.date, 5), // Arredondar para 5 minutos
      quantity: body.quantity
    }
  },
  update: {
    // Atualizar se existir (ou deixar vazio para não atualizar)
  },
  create: {
    invoiceProductId: body.invoiceProductId,
    date: body.date,
    quantity: body.quantity,
    userId: req.user.id
  }
});
```

### Opção 3: Agrupar Recebimentos em Lote

Se o recebimento é feito em lote, criar um único registro de histórico que agrupa múltiplos produtos:

```typescript
// Criar um único registro de histórico para o lote
const receiptHistory = await prisma.receiptHistory.create({
  data: {
    invoiceId: body.invoiceId, // Referência à invoice ao invés de invoiceProduct
    date: new Date(),
    quantity: totalQuantity, // Quantidade total do lote
    userId: req.user.id,
    receiptType: 'BATCH', // Indicar que é um recebimento em lote
    products: { // Relacionamento com múltiplos produtos
      connect: productIds.map(id => ({ id }))
    }
  }
});
```

## Verificação Necessária

1. **Verificar o fluxo de recebimento em lote:**
   - Quantas chamadas são feitas a `POST /invoice/product/receipt-history`?
   - Uma por produto ou uma única para todos?

2. **Verificar o endpoint de recebimento individual:**
   - Está criando múltiplos registros para o mesmo recebimento?
   - Há alguma condição de corrida?

3. **Verificar no banco de dados:**
   - Quantos registros existem no `ReceiptHistory` para o mesmo `invoiceProductId` no mesmo timestamp?
   - Os registros têm `userId` diferente ou `null`?

## Solução Temporária no Frontend

Foi implementada uma deduplicação no frontend que:
- Agrupa registros com diferença de até 5 minutos
- Compara invoice, quantidade e produto
- Remove duplicatas antes de exibir

**Mas a solução ideal é corrigir no backend para evitar duplicação na origem.**

## Prioridade

**ALTA** - Está causando confusão no usuário e dados incorretos no histórico.

