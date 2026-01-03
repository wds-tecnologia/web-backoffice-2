# 🔧 Funcionalidade Necessária - Remover Produto da Invoice ao Marcar como Perdido

## Requisito

Quando um produto é marcado como perdido, ele **DEVE ser removido da lista de produtos da invoice** e **não deve aparecer mais no relatório**.

## Contexto

Atualmente, quando um produto é marcado como perdido via `POST /invoice/lost-products`, o produto ainda aparece na lista de produtos da invoice (seção "Produtos Pendentes").

## Comportamento Esperado

1. **Ao marcar produto como perdido:**
   - Produto é criado na tabela `LostProduct`
   - Produto **deve ser removido** da lista de produtos da invoice
   - Produto **não deve aparecer** em:
     - "Produtos Pendentes"
     - "Produtos Pendentes de Análise"
     - "Produtos Recebidos"
   - Produto **deve aparecer** apenas em:
     - Aba "Produtos Perdidos"

## Solução Necessária

### Opção 1: Deletar o InvoiceProduct (Recomendado se produto foi totalmente perdido)

```typescript
// No endpoint POST /invoice/lost-products
await prisma.lostProduct.create({...});

// Se a quantidade perdida é igual à quantidade total do produto
if (quantityLost >= invoiceProduct.quantity) {
  await prisma.invoiceProduct.delete({
    where: { id: invoiceProductId }
  });
}
```

### Opção 2: Reduzir Quantidade (Se produto pode ser parcialmente perdido)

```typescript
// No endpoint POST /invoice/lost-products
await prisma.lostProduct.create({...});

// Reduzir a quantidade do produto na invoice
await prisma.invoiceProduct.update({
  where: { id: invoiceProductId },
  data: {
    quantity: invoiceProduct.quantity - quantityLost,
    // Se quantity chegar a 0, pode considerar deletar ou marcar como inativo
  }
});
```

### Opção 3: Marcar como Perdido (Flag)

```typescript
// Adicionar campo `lost` no modelo InvoiceProduct
model InvoiceProduct {
  // ...
  lost Boolean @default(false)
  // ...
}

// No endpoint POST /invoice/lost-products
await prisma.lostProduct.create({...});
await prisma.invoiceProduct.update({
  where: { id: invoiceProductId },
  data: { lost: true }
});

// No GET /invoice/get, filtrar produtos perdidos:
where: {
  // ...
  lost: false
}
```

## Recomendação

**Opção 1** se produtos perdidos são sempre totais (não parcial).
**Opção 2** se pode perder parcialmente.
**Opção 3** se quer manter histórico mas ocultar da lista.

## Impacto

- Front-end já está preparado para atualizar a lista após marcar como perdido
- Relatórios devem excluir produtos perdidos automaticamente
- Não afeta funcionalidade de produtos perdidos (já funciona)

## Prioridade

**MÉDIA** - Melhora a organização, mas não bloqueia funcionalidade atual.

