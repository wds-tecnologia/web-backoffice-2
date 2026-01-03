# 🐛 Correção Necessária - Endpoint Produtos Perdidos

## Problema

O endpoint `POST /invoice/lost-products` está retornando erro quando recebe `invoiceId + productId` ao invés de `invoiceProductId`:

```json
[
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["invoiceProductId"],
    "message": "Required"
  }
]
```

## Contexto

O front-end está enviando os dados no formato **Opção 2** (recomendada):

```json
{
  "invoiceId": "uuid-da-invoice",
  "productId": "uuid-do-produto",
  "quantity": 1,
  "freightPercentage": 5,
  "notes": "teste 1"
}
```

Mas o back-end ainda está validando apenas a **Opção 1**:

```json
{
  "invoiceProductId": "uuid-do-invoice-product",
  "quantity": 1,
  "freightPercentage": 5
}
```

## Solução Necessária

O endpoint deve aceitar **AMBAS as opções**:

1. **Opção 1 (manter compatibilidade)**: `invoiceProductId` (UUID)
2. **Opção 2 (recomendada)**: `invoiceId + productId`

### Lógica de Validação Sugerida

```typescript
// Validação deve aceitar:
// - invoiceProductId OU (invoiceId E productId)
if (!body.invoiceProductId && (!body.invoiceId || !body.productId)) {
  return reply.status(400).send({
    message: "Deve informar invoiceProductId OU (invoiceId + productId)",
  });
}

// Se enviou invoiceId + productId, buscar o InvoiceProduct
if (body.invoiceId && body.productId) {
  const invoiceProduct = await prisma.invoiceProduct.findFirst({
    where: {
      invoiceId: body.invoiceId,
      productId: body.productId,
    },
  });

  if (!invoiceProduct) {
    return reply.status(404).send({
      message: "Produto não encontrado nesta invoice",
    });
  }

  // Usar o invoiceProduct.id encontrado
  const invoiceProductId = invoiceProduct.id;
  // ... continuar lógica
}
```

## Benefícios da Opção 2

- ✅ Usuário não precisa buscar UUID do InvoiceProduct
- ✅ Mais intuitivo: seleciona Invoice e Produto diretamente
- ✅ Melhor UX no front-end
- ✅ Reduz erros de usuário

## Arquivos que Podem Precisar de Ajuste

- Controller: `controllers/invoice/lost-products/create.ts`
- Schema de validação (Zod/Yup/etc)
- Documentação da API

## Prioridade

**ALTA** - Bloqueando funcionalidade de marcar produtos como perdidos no front-end.
