# ⚠️ ATENÇÃO - Este Prompt Foi SUBSTITUÍDO

## Status: DEPRECATED / SUBSTITUÍDO

Este prompt foi **substituído** por `PROMPT_BACKEND_PRODUTOS_PERDIDOS_SEMPRE_REMOVER.md`.

**Nova Regra:** Todos os produtos marcados como perdidos devem ser **SEMPRE DELETADOS** da invoice, independentemente de ser perda parcial ou total.

## Motivo da Mudança

Após feedback do usuário, foi identificado que:

- Comportamento atual é **inconsistente**: alguns produtos ficam com quantidade 0, outros somem
- Usuário prefere que **TODOS os produtos perdidos saiam completamente** da lista
- Produtos com quantidade 0 causam problemas na interface (botões bloqueados)

## Novo Comportamento

- ✅ Produto marcado como perdido → **SEMPRE deletado** da invoice
- ✅ Não importa se é perda parcial ou total
- ✅ Produto **sai completamente** da lista de produtos pendentes
- ✅ Produto aparece **apenas** na lista de produtos perdidos

---

# 🔧 (HISTÓRICO) Correção Crítica - Produto Perdido Parcial Deve Reduzir Quantidade, Não Deletar

## Problema Crítico (ANTIGO - Não mais aplicável)

Quando um produto é marcado como perdido com **quantidade PARCIAL** (menor que a quantidade total), o backend está **deletando o produto inteiro** da invoice, quando deveria apenas **reduzir a quantidade**.

### Exemplo do Problema (ANTIGO)

**Cenário:**

- Invoice tem produto com **6 unidades**
- Usuário marca **2 unidades como perdidas**
- **Comportamento Atual (ERRADO):**
  - Produto é **DELETADO completamente** da invoice
  - As **4 unidades restantes somem** (não aparecem em lugar nenhum)
- **Comportamento Esperado (ANTIGO - não mais aplicável):**
  - Produto deve continuar na invoice com **4 unidades** (6 - 2 = 4)
  - Apenas as 2 unidades perdidas vão para a lista de produtos perdidos
  - As 4 unidades restantes continuam disponíveis para análise/recebimento

## Comportamento Esperado

### Caso 1: Perda Parcial (Quantidade Perdida < Quantidade Total)

**Exemplo:** Produto com 6 unidades, marca 2 como perdidas

```
ANTES:
  - InvoiceProduct: quantity = 6

DEPOIS:
  - LostProduct: quantity = 2 (criado)
  - InvoiceProduct: quantity = 4 (reduzido, NÃO deletado)
```

**Código esperado:**

```typescript
if (quantityLost < invoiceProduct.quantity) {
  // Reduzir quantidade do produto na invoice
  await prisma.invoiceProduct.update({
    where: { id: invoiceProductId },
    data: {
      quantity: invoiceProduct.quantity - quantityLost
    }
  });

  // Criar registro de produto perdido
  await prisma.lostProduct.create({...});
}
```

### Caso 2: Perda Total (Quantidade Perdida >= Quantidade Total)

**Exemplo:** Produto com 6 unidades, marca 6 (ou mais) como perdidas

```
ANTES:
  - InvoiceProduct: quantity = 6

DEPOIS:
  - LostProduct: quantity = 6 (criado)
  - InvoiceProduct: DELETADO (não existe mais)
```

**Código esperado:**

```typescript
if (quantityLost >= invoiceProduct.quantity) {
  // Deletar produto da invoice (tudo foi perdido)
  await prisma.invoiceProduct.delete({
    where: { id: invoiceProductId }
  });

  // Criar registro de produto perdido
  await prisma.lostProduct.create({...});
}
```

## Solução Completa

No endpoint `POST /invoice/lost-products`, implementar lógica condicional:

```typescript
// 1. Buscar o InvoiceProduct
const invoiceProduct = await prisma.invoiceProduct.findUnique({
  where: { id: invoiceProductId },
  // OU buscar por invoiceId + productId se usar essa abordagem
});

if (!invoiceProduct) {
  throw new Error("Produto não encontrado na invoice");
}

// 2. Validar quantidade perdida
if (quantityLost > invoiceProduct.quantity) {
  throw new Error(
    `Quantidade perdida (${quantityLost}) não pode ser maior que quantidade total (${invoiceProduct.quantity})`
  );
}

// 3. Calcular valores do produto perdido
const productValue = (invoiceProduct.value / invoiceProduct.quantity) * quantityLost;
const freightValue = invoiceProduct.invoice.amountTaxcarrier
  ? (invoiceProduct.invoice.amountTaxcarrier * (freightPercentage || 0)) / 100
  : 0;
const refundValue = productValue + freightValue;

// 4. Criar registro de produto perdido
await prisma.lostProduct.create({
  data: {
    invoiceProductId: invoiceProduct.id,
    invoiceId: invoiceProduct.invoiceId,
    productId: invoiceProduct.productId,
    quantity: quantityLost,
    value: (invoiceProduct.value / invoiceProduct.quantity) * quantityLost, // Valor proporcional
    total: (invoiceProduct.total / invoiceProduct.quantity) * quantityLost, // Total proporcional
    freightPercentage: freightPercentage || 0,
    freightValue: freightValue,
    refundValue: refundValue,
    notes: notes || null,
  },
});

// 5. Atualizar ou deletar InvoiceProduct baseado na quantidade
if (quantityLost < invoiceProduct.quantity) {
  // CASO 1: Perda Parcial - Reduzir quantidade
  const remainingQuantity = invoiceProduct.quantity - quantityLost;
  const remainingValue = (invoiceProduct.value / invoiceProduct.quantity) * remainingQuantity;
  const remainingTotal = (invoiceProduct.total / invoiceProduct.quantity) * remainingQuantity;

  await prisma.invoiceProduct.update({
    where: { id: invoiceProductId },
    data: {
      quantity: remainingQuantity,
      value: remainingValue,
      total: remainingTotal,
      // Ajustar peso se necessário
      weight: invoiceProduct.weight
        ? (invoiceProduct.weight / invoiceProduct.quantity) * remainingQuantity
        : invoiceProduct.weight,
    },
  });
} else {
  // CASO 2: Perda Total - Deletar produto da invoice
  await prisma.invoiceProduct.delete({
    where: { id: invoiceProductId },
  });
}

// 6. Se invoice está paga e ficou sem produtos, marcar como concluída
const updatedInvoice = await prisma.invoice.findUnique({
  where: { id: invoiceProduct.invoiceId },
  include: { products: true },
});

if (updatedInvoice.paid && updatedInvoice.products.length === 0) {
  await prisma.invoice.update({
    where: { id: invoiceProduct.invoiceId },
    data: { completed: true },
  });
}
```

## Validações Importantes

1. **Quantidade perdida não pode ser maior que quantidade total:**

   ```typescript
   if (quantityLost > invoiceProduct.quantity) {
     throw new Error("Quantidade perdida não pode ser maior que quantidade total");
   }
   ```

2. **Quantidade perdida deve ser inteira e positiva:**

   ```typescript
   if (!Number.isInteger(quantityLost) || quantityLost <= 0) {
     throw new Error("Quantidade deve ser um número inteiro positivo");
   }
   ```

3. **Cálculo proporcional de valores:**
   - Se produto tem `value: 100` e `quantity: 6`
   - Se perde 2 unidades: `valuePerUnit = 100 / 6 = 16.67`
   - Valor perdido: `16.67 * 2 = 33.34`
   - Valor restante: `16.67 * 4 = 66.66`

## Testes Necessários

1. ✅ Produto com 6 unidades, marca 2 como perdidas → produto continua com 4 unidades
2. ✅ Produto com 6 unidades, marca 6 como perdidas → produto é deletado
3. ✅ Produto com 6 unidades, marca 10 como perdidas → erro (quantidade inválida)
4. ✅ Valores (value, total, weight) são calculados proporcionalmente
5. ✅ Invoice paga sem produtos após perda total → marca como concluída

## Impacto

**CRÍTICO** - Está causando perda de dados. Produtos que deveriam continuar disponíveis estão sumindo completamente.

## Prioridade

**URGENTE** - Bloqueia funcionalidade e causa perda de dados.
