# 🔧 Regra de Negócio - Auto-conclusão de Invoice ao Receber Todos os Produtos

## Requisito

Quando o usuário clica em **"Receber Todos"** e **todos os produtos são recebidos**, a invoice deve ser **automaticamente marcada como concluída** (`completed: true`), **sem necessidade de ação manual adicional**.

## Regra de Negócio

```
SE invoice.paid === true
E todos os produtos foram recebidos (todos os produtos têm received === true OU quantityAnalizer === 0 e receivedQuantity >= quantity)
E não há produtos pendentes (todos os produtos foram processados)
ENTÃO invoice.completed = true (AUTOMÁTICO, sem confirmação)
```

## Contexto

Atualmente, quando o usuário clica em "Receber Todos" para receber todos os produtos em análise, mesmo que todos os produtos sejam recebidos, a invoice não é automaticamente marcada como concluída.

### Fluxo Atual (Frontend)

1. Usuário clica em "Receber Todos"
2. Frontend faz `PATCH /invoice/update/product` para cada produto em análise
3. Produtos são marcados como `received: true`
4. **PROBLEMA:** Invoice não é marcada como `completed: true` automaticamente

### Comportamento Esperado

1. Usuário clica em "Receber Todos"
2. Frontend faz `PATCH /invoice/update/product` para cada produto em análise
3. Produtos são marcados como `received: true`
4. **AUTOMÁTICO:** Backend verifica se todos os produtos foram recebidos e se a invoice está paga, então marca `completed = true`

## Solução Necessária

### Opção 1: Verificar após cada atualização de produto (Recomendado)

No endpoint `PATCH /invoice/update/product`, após atualizar o produto, verificar se todos os produtos da invoice foram recebidos:

```typescript
// PATCH /invoice/update/product
export async function updateInvoiceProduct(req: Request, res: Response) {
  const { idProductInvoice, bodyupdate } = req.body;
  
  // Atualizar o produto
  await prisma.invoiceProduct.update({
    where: { id: idProductInvoice },
    data: bodyupdate
  });
  
  // Buscar a invoice com todos os produtos
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId }, // Precisará buscar o invoiceId do produto
    include: { 
      products: true 
    }
  });
  
  // Verificar se invoice está paga e todos os produtos foram recebidos
  if (invoice?.paid) {
    const allProductsReceived = invoice.products.every(
      (product) => product.received === true || 
      (product.receivedQuantity >= product.quantity && product.quantityAnalizer === 0)
    );
    
    if (allProductsReceived && !invoice.completed) {
      // Marcar como concluída AUTOMATICAMENTE
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { completed: true }
      });
    }
  }
  
  // Retornar resposta
  return res.json({ success: true });
}
```

### Opção 2: Endpoint separado para verificar conclusão

Criar um endpoint que verifica e marca invoices como concluídas:

```typescript
// POST /invoice/check-completion/:invoiceId
export async function checkInvoiceCompletion(req: Request, res: Response) {
  const { invoiceId } = req.params;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { products: true }
  });
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice não encontrada" });
  }
  
  // Verificar se invoice está paga
  if (!invoice.paid) {
    return res.json({ completed: false, message: "Invoice não está paga" });
  }
  
  // Verificar se todos os produtos foram recebidos
  const allProductsReceived = invoice.products.every(
    (product) => product.received === true || 
    (product.receivedQuantity >= product.quantity && product.quantityAnalizer === 0)
  );
  
  // Se todos foram recebidos e ainda não está concluída, marcar como concluída
  if (allProductsReceived && !invoice.completed) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { completed: true }
    });
    
    return res.json({ completed: true, message: "Invoice marcada como concluída" });
  }
  
  return res.json({ completed: invoice.completed });
}
```

**Frontend chamaria este endpoint após "Receber Todos":**

```typescript
// Após receber todos os produtos
await api.post(`/invoice/check-completion/${selectedInvoice.id}`);
```

## Condições para Auto-conclusão

A invoice deve ser marcada como concluída automaticamente quando:

1. ✅ Invoice está **paga** (`paid === true`)
2. ✅ **Todos os produtos foram recebidos:**
   - `received === true` para todos os produtos, OU
   - `receivedQuantity >= quantity` e `quantityAnalizer === 0` para todos os produtos
3. ✅ Não há produtos pendentes de análise (`quantityAnalizer === 0` para todos)
4. ✅ Invoice ainda não está concluída (`completed === false`)

## Casos de Teste

1. ✅ Invoice paga com 3 produtos em análise → clica "Receber Todos" → todos recebidos → invoice deve ficar concluída automaticamente
2. ✅ Invoice paga com produtos parcialmente recebidos → recebe o restante → todos recebidos → invoice deve ficar concluída automaticamente
3. ✅ Invoice não paga com produtos → recebe todos → invoice **NÃO** deve ficar concluída (só paga pode ficar concluída)
4. ✅ Invoice paga com produtos → recebe alguns (não todos) → invoice **NÃO** deve ficar concluída
5. ✅ Invoice paga com produtos → todos recebidos → **SEM confirmação do usuário**, invoice é concluída automaticamente

## Integração com Outras Regras

Esta regra complementa:
- `PROMPT_BACKEND_INVOICE_AUTO_COMPLETAR_SEM_ANALISE.md` - Auto-conclusão quando todos os produtos são perdidos
- `PROMPT_BACKEND_INVOICE_CONCLUIDA_QUANDO_PERDIDOS.md` - Conclusão quando produtos são perdidos

## Prioridade

**ALTA** - Melhora significativamente a experiência do usuário, eliminando passos desnecessários após receber todos os produtos.

## Impacto

- **Front-end:** Pode chamar o endpoint de verificação após "Receber Todos", ou o backend pode fazer automaticamente
- **UX:** Melhor experiência, menos cliques e confirmações desnecessárias
- **Consistência:** Garante que invoices com todos os produtos recebidos sejam marcadas como concluídas automaticamente

