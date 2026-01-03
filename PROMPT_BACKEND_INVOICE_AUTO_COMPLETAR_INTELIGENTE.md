# 🔧 Regra de Negócio - Auto-conclusão Inteligente de Invoice (Dinâmica)

## Requisito

Quando uma invoice está **paga** (`paid: true`) e **todos os produtos foram processados** (todos estão **perdidos OU recebidos**), a invoice deve ser **automaticamente marcada como concluída** (`completed: true`), **sem necessidade de ação manual do usuário**.

## Regra de Negócio (Inteligente e Dinâmica)

```
SE invoice.paid === true
E todos os produtos foram processados:
  - Produto foi marcado como perdido (não existe mais na invoice OU está na tabela LostProduct), OU
  - Produto foi recebido (received === true OU receivedQuantity >= quantity)
E não há produtos pendentes de processamento
ENTÃO invoice.completed = true (AUTOMÁTICO, sem confirmação)
```

## Contexto

A invoice deve ser marcada como concluída quando **todos os produtos foram processados**, independentemente se foram:
- **Perdidos** (marcados como perdido)
- **Recebidos** (marcados como recebido)
- **Mistura de ambos** (alguns perdidos, outros recebidos)

### Comportamento Esperado (Exemplos)

**Cenário 1: Todos Perdidos**
- Invoice paga com 3 produtos
- Todos os 3 produtos são marcados como perdidos
- ✅ Invoice deve ser automaticamente concluída

**Cenário 2: Todos Recebidos**
- Invoice paga com 3 produtos
- Todos os 3 produtos são recebidos (via "Receber Todos" ou individualmente)
- ✅ Invoice deve ser automaticamente concluída

**Cenário 3: Mistura (Alguns Perdidos, Outros Recebidos)**
- Invoice paga com 5 produtos
- 2 produtos são marcados como perdidos
- 3 produtos são recebidos
- ✅ Invoice deve ser automaticamente concluída (todos processados)

**Cenário 4: Ainda Há Pendentes**
- Invoice paga com 5 produtos
- 3 produtos são recebidos
- 2 produtos ainda estão pendentes (não perdidos, não recebidos)
- ❌ Invoice **NÃO** deve ser concluída (ainda há pendentes)

## Solução Necessária

### Função Helper para Verificar Conclusão

Criar uma função helper que verifica se todos os produtos foram processados:

```typescript
async function shouldCompleteInvoice(invoiceId: string): Promise<boolean> {
  // Buscar invoice com produtos
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { products: true }
  });
  
  if (!invoice || !invoice.paid) {
    return false; // Invoice não está paga, não pode ser concluída
  }
  
  // Se não há produtos, considerar concluída (todos foram perdidos)
  if (invoice.products.length === 0) {
    return true;
  }
  
  // Verificar se TODOS os produtos foram processados
  const allProcessed = invoice.products.every((product) => {
    // Produto foi recebido
    const isReceived = product.received === true || 
                      (product.receivedQuantity >= product.quantity && product.quantityAnalizer === 0);
    
    // OU produto foi perdido (verificar na tabela LostProduct)
    // Nota: Se o produto foi completamente perdido, ele pode ter sido deletado da invoice
    // Mas se foi parcialmente perdido, ele ainda existe na invoice com quantity reduzida
    
    return isReceived; // Se recebido, está processado
    // Se não recebido, mas foi perdido, ele não estaria mais na invoice (deletado)
    // OU teria quantity reduzida, então precisa verificar se quantity restante foi recebida
  });
  
  // Buscar produtos perdidos desta invoice para verificar
  const lostProducts = await prisma.lostProduct.findMany({
    where: { invoiceId: invoiceId },
    include: { invoiceProduct: true }
  });
  
  // Para cada produto na invoice, verificar se foi completamente processado
  const allProductsProcessed = invoice.products.every((product) => {
    // Verificar se produto foi recebido completamente
    const isFullyReceived = product.received === true || 
                           (product.receivedQuantity >= product.quantity && product.quantityAnalizer === 0);
    
    if (isFullyReceived) {
      return true; // Produto foi recebido, está processado
    }
    
    // Verificar quantidade perdida deste produto
    const lostForThisProduct = lostProducts
      .filter(lp => lp.invoiceProductId === product.id)
      .reduce((sum, lp) => sum + lp.quantity, 0);
    
    // Se quantidade perdida + quantidade recebida >= quantidade total, está processado
    const totalProcessed = lostForThisProduct + (product.receivedQuantity || 0);
    return totalProcessed >= product.quantity;
  });
  
  return allProductsProcessed;
}

async function autoCompleteInvoiceIfNeeded(invoiceId: string): Promise<boolean> {
  const shouldComplete = await shouldCompleteInvoice(invoiceId);
  
  if (shouldComplete) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (invoice && !invoice.completed) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { completed: true }
      });
      return true; // Foi marcada como concluída
    }
  }
  
  return false; // Não foi marcada como concluída
}
```

### Implementação nos Endpoints

#### 1. Endpoint de Lost Products

```typescript
// POST /invoice/lost-products
export async function createLostProduct(req: Request, res: Response) {
  // ... criar lostProduct
  await prisma.lostProduct.create({...});
  
  // ... atualizar/deletar invoiceProduct
  await prisma.invoiceProduct.update({...}); // ou delete
  
  // Verificar se invoice deve ser concluída
  await autoCompleteInvoiceIfNeeded(invoiceId);
  
  return res.json({ success: true });
}
```

#### 2. Endpoint de Update Product (Receber)

```typescript
// PATCH /invoice/update/product
export async function updateInvoiceProduct(req: Request, res: Response) {
  const { idProductInvoice, bodyupdate } = req.body;
  
  // Buscar invoiceId do produto
  const invoiceProduct = await prisma.invoiceProduct.findUnique({
    where: { id: idProductInvoice },
    select: { invoiceId: true }
  });
  
  // Atualizar o produto
  await prisma.invoiceProduct.update({
    where: { id: idProductInvoice },
    data: bodyupdate
  });
  
  // Verificar se invoice deve ser concluída
  if (invoiceProduct) {
    await autoCompleteInvoiceIfNeeded(invoiceProduct.invoiceId);
  }
  
  return res.json({ success: true });
}
```

## Lógica de Verificação Detalhada

Um produto é considerado **processado** quando:

1. **Recebido completamente:**
   - `received === true`, OU
   - `receivedQuantity >= quantity` E `quantityAnalizer === 0`

2. **Perdido completamente:**
   - Produto foi deletado da invoice (quantity perdida >= quantity total), OU
   - `quantity` foi reduzida e a quantidade restante + quantidade perdida >= quantity original

3. **Mistura (parcialmente perdido + parcialmente recebido):**
   - `receivedQuantity + lostQuantity >= quantity` (soma das quantidades perdidas e recebidas)

## Casos de Teste

1. ✅ Invoice paga com 3 produtos → todos perdidos → invoice concluída automaticamente
2. ✅ Invoice paga com 3 produtos → todos recebidos → invoice concluída automaticamente
3. ✅ Invoice paga com 5 produtos → 2 perdidos + 3 recebidos → invoice concluída automaticamente
4. ✅ Invoice paga com 5 produtos → 3 recebidos + 2 pendentes → invoice **NÃO** concluída
5. ✅ Invoice paga com 1 produto → perdido parcialmente (2 de 5) → invoice **NÃO** concluída
6. ✅ Invoice paga com 1 produto → perdido 2 + recebido 3 de 5 → invoice concluída automaticamente
7. ✅ Invoice não paga → todos processados → invoice **NÃO** concluída (só paga pode ser concluída)

## Integração com Frontend

O frontend deve:
- Fechar o modal após receber a resposta do backend
- Recarregar a lista de invoices para refletir o status atualizado
- O backend retorna `completed: true` na resposta, então o frontend pode fechar o modal

## Prioridade

**ALTA** - Funcionalidade crítica para UX, eliminando passos desnecessários.

## Impacto

- **Backend:** Implementa lógica inteligente e dinâmica
- **Frontend:** Fecha modal após conclusão automática
- **UX:** Processo mais fluido e automático

