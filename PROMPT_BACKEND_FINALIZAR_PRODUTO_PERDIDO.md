# 🔧 Nova Funcionalidade - Finalizar Produto Perdido e Creditar no Caixa

## Requisito

Quando um produto perdido é finalizado/concluído, o sistema deve:

1. Marcar o produto perdido como concluído/finalizado
2. Criar uma transação no caixa do transportador selecionado
3. A transação deve ser **positiva (IN)** com valor igual ao `refundValue`
4. A descrição deve ser: "mercadoria perdida"
5. Opcionalmente, marcar o produto perdido com status de concluído

## Endpoint Necessário

### Opção 1: Endpoint Específico para Finalizar

```
POST /invoice/lost-products/:id/finalize
Body: {
  carrierId: string,  // ID do transportador/freteiro
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Produto perdido finalizado com sucesso",
  "transaction": {
    "id": "uuid",
    "value": 2270.0,
    "direction": "IN",
    "description": "mercadoria perdida",
    "entityId": "carrier-id",
    "entityType": "CARRIER"
  }
}
```

### Opção 2: Adicionar Campo de Status no LostProduct

Adicionar campo `completed` ou `finalized` no modelo `LostProduct`:

```prisma
model LostProduct {
  // ... campos existentes
  completed Boolean @default(false)
  completedAt DateTime?
  completedByUserId String?
  completedCarrierId String?  // Transportador selecionado para creditar
}
```

E criar endpoint:

```
PATCH /invoice/lost-products/:id/finalize
Body: {
  carrierId: string,
  completed: true
}
```

## Implementação Esperada

```typescript
// POST /invoice/lost-products/:id/finalize
const lostProduct = await prisma.lostProduct.findUnique({
  where: { id: lostProductId },
  include: { invoiceProduct: { include: { invoice: true } } },
});

if (!lostProduct) {
  throw new Error("Produto perdido não encontrado");
}

if (lostProduct.completed) {
  throw new Error("Produto perdido já foi finalizado");
}

// Verificar se o carrier existe
const carrier = await prisma.carrier.findUnique({
  where: { id: body.carrierId },
});

if (!carrier) {
  throw new Error("Transportador não encontrado");
}

// Criar transação no caixa do transportador
const transaction = await prisma.transactionBoxUserInvoice.create({
  data: {
    value: lostProduct.refundValue,
    direction: "IN", // Entrada (crédito)
    date: new Date(),
    description: "mercadoria perdida",
    entityId: body.carrierId,
    entityType: "CARRIER",
    userId: req.user.id, // ID do usuário atual
  },
});

// Marcar produto perdido como concluído
await prisma.lostProduct.update({
  where: { id: lostProductId },
  data: {
    completed: true,
    completedAt: new Date(),
    completedByUserId: req.user.id,
    completedCarrierId: body.carrierId,
  },
});

return {
  success: true,
  message: "Produto perdido finalizado com sucesso",
  transaction,
};
```

## Campos do LostProduct

Se usar a Opção 2, adicionar ao modelo Prisma:

```prisma
model LostProduct {
  // ... campos existentes
  completed Boolean @default(false)
  completedAt DateTime?
  completedByUserId String?
  completedCarrierId String?
  completedBy User? @relation("LostProductCompletedBy", fields: [completedByUserId], references: [id])
  completedCarrier Carrier? @relation(fields: [completedCarrierId], references: [id])
}

model User {
  // ... outros campos
  completedLostProducts LostProduct[] @relation("LostProductCompletedBy")
}

model Carrier {
  // ... outros campos
  completedLostProducts LostProduct[]
}
```

## Migração

```bash
npx prisma migrate dev --name add_lost_product_completion
```

## Prioridade

**MÉDIA** - Funcionalidade nova, não bloqueia uso atual.
