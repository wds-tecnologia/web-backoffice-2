# 🔧 Correção Crítica - Finalização de Listas de Produtos Perdidos por Data

## Problema Crítico

Atualmente, quando uma lista de produtos perdidos é finalizada/concluída no frontend, esse estado **não é persistido no backend**. Quando o usuário recarrega a página, a lista volta ao estado "não concluída", permitindo que o pagamento seja adicionado novamente.

## Requisitos de Negócio

1. **Listas concluídas são permanentes**: Quando uma lista de produtos perdidos é concluída em uma data, ela **nunca mais pode ser modificada**.

2. **Agrupamento por data (timezone Brasil UTC-3)**:
   - Produtos devem ser agrupados por data de criação (considerando timezone do Brasil: UTC-3)
   - Todos os produtos criados no mesmo dia (horário do Brasil) devem estar na mesma lista

3. **Lógica de agrupamento por lista**:
   - Se uma lista do dia X está **concluída**, produtos do dia X+1 devem criar uma **nova lista**
   - Se uma lista do dia X **não está concluída**, produtos do dia X+1 podem cair na **mesma lista do dia X**

4. **Endpoint para finalizar lista por data**:
   - Deve finalizar todos os produtos perdidos de uma data específica
   - Deve criar transação no caixa do transportador
   - Deve marcar a lista como concluída permanentemente

## Solução Necessária

### Opção 1: Adicionar Campo `completedDate` no LostProduct (Recomendado)

Adicionar campos no modelo `LostProduct`:

```prisma
model LostProduct {
  // ... campos existentes
  completedDate String?  // Data formatada "DD/MM/YYYY" (timezone Brasil) quando a lista foi concluída
  completedAt DateTime?  // Timestamp UTC quando foi concluída
  completedByUserId String?
  completedCarrierId String?
  completedBy User? @relation("LostProductCompletedBy", fields: [completedByUserId], references: [id])
  completedCarrier Carrier? @relation(fields: [completedCarrierId], references: [id])
}
```

### Opção 2: Criar Tabela Separada para Listas Concluídas

```prisma
model LostProductList {
  id String @id @default(uuid())
  date String  // Data formatada "DD/MM/YYYY" (timezone Brasil)
  completed Boolean @default(false)
  completedAt DateTime?
  completedByUserId String?
  completedCarrierId String?
  freightPercentage Float @default(0)
  totalValue Float
  products LostProduct[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Recomendação: Opção 1 é mais simples e adequada**

## Endpoint Necessário

### Finalizar Lista por Data

```
POST /invoice/lost-products/finalize-by-date
Body: {
  date: "03/01/2026",  // Data formatada "DD/MM/YYYY" (timezone Brasil)
  carrierId: string,
  freightPercentage: number
}
```

**Implementação Esperada:**

```typescript
// POST /invoice/lost-products/finalize-by-date
export async function finalizeLostProductsByDate(req: Request, res: Response) {
  const { date, carrierId, freightPercentage } = req.body;
  const userId = req.user.id;

  // Validar data (formato DD/MM/YYYY)
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: "Data inválida. Use formato DD/MM/YYYY" });
  }

  // Converter data para Date object (timezone Brasil UTC-3)
  const [day, month, year] = date.split("/");
  const dateStart = new Date(`${year}-${month}-${day}T03:00:00.000Z`); // 00:00 Brasil = 03:00 UTC
  const dateEnd = new Date(dateStart);
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

  // Buscar todos os produtos perdidos da data que ainda não foram concluídos
  const lostProducts = await prisma.lostProduct.findMany({
    where: {
      createdAt: {
        gte: dateStart,
        lt: dateEnd,
      },
      completedDate: null, // Apenas produtos não concluídos
    },
    include: {
      invoiceProduct: {
        include: {
          invoice: true,
        },
      },
    },
  });

  if (lostProducts.length === 0) {
    return res.status(404).json({ error: "Nenhum produto perdido encontrado para esta data ou lista já foi concluída" });
  }

  // Verificar se já foi concluída (caso algum produto já tenha completedDate)
  const alreadyCompleted = lostProducts.some(p => p.completedDate === date);
  if (alreadyCompleted) {
    return res.status(400).json({ error: "Lista desta data já foi concluída" });
  }

  // Calcular valores
  const subtotal = lostProducts.reduce((sum, p) => sum + p.refundValue, 0);
  const freightValue = subtotal * (freightPercentage || 0) / 100;
  const total = subtotal + freightValue;

  // Verificar se carrier existe
  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
  });

  if (!carrier) {
    return res.status(404).json({ error: "Transportador não encontrado" });
  }

  // Criar transação no caixa do transportador
  const transaction = await prisma.transactionBoxUserInvoice.create({
    data: {
      value: total,
      direction: "IN",
      date: new Date(),
      description: `mercadoria perdida - ${date}`,
      entityId: carrierId,
      entityType: "CARRIER",
      userId: userId,
    },
  });

  // Atualizar todos os produtos perdidos da data com completedDate
  await prisma.lostProduct.updateMany({
    where: {
      id: {
        in: lostProducts.map(p => p.id),
      },
    },
    data: {
      completedDate: date,
      completedAt: new Date(),
      completedByUserId: userId,
      completedCarrierId: carrierId,
      freightPercentage: freightPercentage || 0,
    },
  });

  return res.json({
    success: true,
    message: "Lista de produtos perdidos finalizada com sucesso",
    date,
    productsCount: lostProducts.length,
    subtotal,
    freightPercentage,
    freightValue,
    total,
    transaction,
  });
}
```

### Endpoint para Buscar Produtos Perdidos (Modificado)

O endpoint `GET /invoice/lost-products` deve retornar o campo `completedDate`:

```typescript
// GET /invoice/lost-products
const lostProducts = await prisma.lostProduct.findMany({
  include: {
    invoiceProduct: {
      include: {
        product: {
          select: { id: true, name: true, code: true, description: true },
        },
        invoice: {
          include: {
            supplier: {
              select: { id: true, name: true, phone: true },
            },
          },
          select: { id: true, number: true, date: true, supplier: true },
        },
      },
    },
  },
  orderBy: {
    createdAt: "desc",
  },
});

// Retornar com completedDate
return res.json({
  lostProducts,
  totalRefund: lostProducts.reduce((sum, p) => sum + p.refundValue, 0),
  count: lostProducts.length,
});
```

## Lógica de Agrupamento no Frontend

O frontend irá agrupar produtos perdidos por `completedDate` (se concluída) ou por data de criação (se não concluída), considerando timezone do Brasil (UTC-3).

### Helper Function para Timezone Brasil

```typescript
function getBrazilDate(date: Date): string {
  // Converter para timezone Brasil (UTC-3)
  const brazilOffset = -3 * 60; // UTC-3 em minutos
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (brazilOffset * 60000));
  
  const day = String(brazilTime.getUTCDate()).padStart(2, '0');
  const month = String(brazilTime.getUTCMonth() + 1).padStart(2, '0');
  const year = brazilTime.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
}
```

## Migração

```bash
npx prisma migrate dev --name add_lost_product_completed_date
```

## Campos do Prisma

```prisma
model LostProduct {
  id String @id @default(uuid())
  invoiceProductId String
  invoiceId String
  productId String
  quantity Int
  value Float
  total Float
  freightPercentage Float @default(0)
  freightValue Float @default(0)
  refundValue Float
  notes String?
  completedDate String?  // NOVO: Data "DD/MM/YYYY" quando lista foi concluída
  completedAt DateTime?  // NOVO: Timestamp UTC
  completedByUserId String?  // NOVO
  completedCarrierId String?  // NOVO
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  invoiceProduct InvoiceProduct @relation(fields: [invoiceProductId], references: [id])
  completedBy User? @relation("LostProductCompletedBy", fields: [completedByUserId], references: [id])
  completedCarrier Carrier? @relation(fields: [completedCarrierId], references: [id])
  
  @@index([completedDate])
  @@index([createdAt])
}
```

## Prioridade

**ALTA** - Problema crítico que permite duplicação de pagamentos.

