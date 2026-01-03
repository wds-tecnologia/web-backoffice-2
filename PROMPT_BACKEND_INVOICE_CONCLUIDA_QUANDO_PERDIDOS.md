# 🔧 Correção Necessária - Invoice Deve Ser Marcada como Concluída Quando Fica Sem Produtos

## Problema

Quando uma invoice está **paga** (`paid: true`) e **todos os produtos são marcados como perdidos**, a invoice fica zerada (sem produtos) mas **não é marcada como concluída** (`completed: true`).

## Comportamento Esperado

Quando uma invoice paga fica sem produtos (todos foram marcados como perdidos), ela deve ser **automaticamente marcada como concluída**.

### Regra de Negócio

```
SE invoice.paid === true
E invoice.products.length === 0 (ou todos os produtos foram removidos/marcados como perdidos)
ENTÃO invoice.completed = true
```

## Contexto

### Fluxo Atual

1. Invoice está criada com produtos
2. Invoice é marcada como **paga** (`paid: true`)
3. Usuário marca produtos como perdidos via `POST /invoice/lost-products`
4. Backend remove produtos da invoice (conforme `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REMOVER_DA_INVOICE.md`)
5. Invoice fica sem produtos (`products.length === 0`)
6. **PROBLEMA:** Invoice não é marcada como `completed: true`

### Comportamento Esperado

1. Invoice está criada com produtos
2. Invoice é marcada como **paga** (`paid: true`)
3. Usuário marca produtos como perdidos via `POST /invoice/lost-products`
4. Backend remove produtos da invoice
5. Invoice fica sem produtos (`products.length === 0`)
6. **SOLUÇÃO:** Backend deve verificar se `paid === true` e `products.length === 0`, então marcar `completed = true`

## Solução Necessária

### Opção 1: Marcar como Concluída no Endpoint de Lost Products (Recomendado)

No endpoint `POST /invoice/lost-products`, após remover o produto da invoice, verificar se a invoice ficou sem produtos e se está paga:

```typescript
// Após criar o lostProduct e remover/atualizar o invoiceProduct
await prisma.lostProduct.create({...});
await prisma.invoiceProduct.delete({...}); // ou update

// Buscar a invoice atualizada
const updatedInvoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: { products: true }
});

// Se invoice está paga e não tem mais produtos, marcar como concluída
if (updatedInvoice.paid && updatedInvoice.products.length === 0) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { completed: true }
  });
}
```

### Opção 2: Hook/Middleware no Prisma

Criar um hook que verifica automaticamente após qualquer alteração em produtos:

```typescript
// No hook após update/delete de InvoiceProduct
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (params.model === "InvoiceProduct" && (params.action === "delete" || params.action === "update")) {
    // Buscar invoice relacionada
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.args.where.invoiceId },
      include: { products: true },
    });

    // Se invoice está paga e não tem produtos, marcar como concluída
    if (invoice?.paid && invoice.products.length === 0) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { completed: true },
      });
    }
  }

  return result;
});
```

### Opção 3: Endpoint Separado para Verificar Conclusão

Criar um endpoint que verifica e marca invoices como concluídas:

```typescript
// POST /invoice/check-completion/:invoiceId
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: { products: true },
});

if (invoice.paid && invoice.products.length === 0 && !invoice.completed) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { completed: true },
  });
}
```

## Recomendação

**Opção 1** é a mais direta e garante que a invoice seja marcada como concluída imediatamente após todos os produtos serem marcados como perdidos.

## Casos de Teste

1. ✅ Invoice paga com 1 produto → marca produto como perdido → invoice deve ficar concluída
2. ✅ Invoice paga com 3 produtos → marca todos como perdidos → invoice deve ficar concluída
3. ✅ Invoice não paga com produtos → marca todos como perdidos → invoice NÃO deve ficar concluída (só paga pode ficar concluída)
4. ✅ Invoice paga com produtos → marca alguns como perdidos (não todos) → invoice NÃO deve ficar concluída

## Observação Importante

**IMPORTANTE:** Esta conclusão deve ser **AUTOMÁTICA**, sem necessidade de confirmação do usuário. Quando todos os produtos são marcados como perdidos e não há produtos em análise, a invoice deve ser marcada como concluída imediatamente, sem esperar qualquer ação adicional do usuário.

Veja também: `PROMPT_BACKEND_INVOICE_AUTO_COMPLETAR_SEM_ANALISE.md` para detalhes sobre auto-conclusão.

## Prioridade

**ALTA** - Está causando inconsistência no estado das invoices.

## Impacto

- Front-end já está preparado para exibir invoices concluídas corretamente
- Relatórios podem filtrar por invoices concluídas
- Melhora a consistência dos dados
