# 🔧 Correção Necessária - Endpoint GET /invoice/lost-products

## Problema

O endpoint `GET /invoice/lost-products` está retornando produtos perdidos, mas **não está incluindo as relações necessárias** (`invoiceProduct`, `product`, `invoice`, `supplier`), causando erro no front-end:

```
TypeError: Cannot read properties of undefined (reading 'product')
```

## Contexto

O front-end espera receber os dados com as seguintes relações:

```typescript
{
  id: string;
  invoiceProductId: string;
  quantity: number;
  freightPercentage: number;
  // ... outros campos
  invoiceProduct: {
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      code: string;
    };
    invoice: {
      id: string;
      number: string;
      supplier: {
        name: string;
      };
    };
  };
}
```

## Solução Necessária

O endpoint deve incluir as relações usando `include` ou `select` do Prisma:

```typescript
const lostProducts = await prisma.lostProduct.findMany({
  include: {
    invoiceProduct: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        invoice: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          select: {
            id: true,
            number: true,
            supplier: true,
          },
        },
      },
    },
  },
});
```

## Campos Necessários

### LostProduct
- `id`
- `invoiceProductId`
- `quantity`
- `freightPercentage`
- `freightValue`
- `refundValue`
- `notes`
- `createdAt`
- `updatedAt`

### invoiceProduct (relação)
- `id`
- `productId`
- `value`
- `weight`
- `product` (relação)
  - `id`
  - `name`
  - `code`
- `invoice` (relação)
  - `id`
  - `number`
  - `supplier` (relação)
    - `id`
    - `name`

## Prioridade

**ALTA** - Bloqueando visualização da lista de produtos perdidos no front-end.

