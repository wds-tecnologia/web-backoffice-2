# 🐛 Erro Crítico - Prisma Include/Select no POST /invoice/lost-products

## Erro

```
Invalid `prisma.lostProduct.create()` invocation
Please either use `include` or `select`, but not both at the same time.
```

## Problema

O código está usando `include` e `select` ao mesmo tempo no Prisma, o que não é permitido.

**Código com erro:**

```typescript
const lostProduct = await prisma.lostProduct.create({
  data: {
    invoiceProductId: "...",
    invoiceId: "...",
    productId: "...",
    quantity: 1,
    // ... outros campos
  },
  include: {
    product: { select: { ... } },  // ❌ ERRO: include com select dentro
    invoice: {
      include: {
        supplier: { select: { ... } },
        carrier: { select: { ... } },
        carrier2: { select: { ... } }
      },
      select: { ... }  // ❌ ERRO: include e select no mesmo nível
    },
    invoiceProduct: {
      include: {
        product: { select: { ... } },
        invoice: {
          include: {
            supplier: { select: { ... } }
          },
          select: { ... }  // ❌ ERRO: include e select no mesmo nível
        }
      },
      select: { ... }  // ❌ ERRO: include e select no mesmo nível
    }
  }
});
```

## Solução

Use apenas `include` (sem `select` dentro) OU apenas `select` (sem `include`).

### Opção 1: Usar apenas `include` (mais simples)

```typescript
const lostProduct = await prisma.lostProduct.create({
  data: {
    invoiceProductId: invoiceProductId,
    invoiceId: body.invoiceId,
    productId: body.productId,
    quantity: body.quantity,
    value: productValue,
    total: productValue * body.quantity,
    freightPercentage: body.freightPercentage || 0,
    freightValue: totalFreightValue,
    refundValue: refundValue,
    notes: body.notes || null,
  },
  include: {
    invoiceProduct: {
      include: {
        product: true, // ✅ Inclui todos os campos do product
        invoice: {
          include: {
            supplier: true, // ✅ Inclui todos os campos do supplier
          },
        },
      },
    },
  },
});
```

### Opção 2: Usar apenas `select` (mais controlado)

```typescript
const lostProduct = await prisma.lostProduct.create({
  data: {
    invoiceProductId: invoiceProductId,
    invoiceId: body.invoiceId,
    productId: body.productId,
    quantity: body.quantity,
    value: productValue,
    total: productValue * body.quantity,
    freightPercentage: body.freightPercentage || 0,
    freightValue: totalFreightValue,
    refundValue: refundValue,
    notes: body.notes || null,
  },
  select: {
    id: true,
    invoiceProductId: true,
    invoiceId: true,
    productId: true,
    quantity: true,
    value: true,
    total: true,
    freightPercentage: true,
    freightValue: true,
    refundValue: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    invoiceProduct: {
      select: {
        id: true,
        productId: true,
        invoiceId: true,
        quantity: true,
        value: true,
        weight: true,
        total: true,
        received: true,
        receivedQuantity: true,
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        invoice: {
          select: {
            id: true,
            number: true,
            date: true,
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    },
  },
});
```

## Recomendação

**Use a Opção 1 (`include`)** porque:

- É mais simples
- Inclui automaticamente todos os campos necessários
- É mais fácil de manter
- O front-end já está preparado para receber todos os campos

Se você quer limitar os campos por performance, use a Opção 2 (`select`), mas **nunca misture os dois**.

## Localização do Erro

Arquivo: Provavelmente em `controllers/invoice/lost-products/create.ts`
Linha: Aproximadamente linha 20231 (conforme stack trace)
Função: `prisma.lostProduct.create()`

## Prioridade

**CRÍTICA** - Bloqueando completamente a criação de produtos perdidos.
