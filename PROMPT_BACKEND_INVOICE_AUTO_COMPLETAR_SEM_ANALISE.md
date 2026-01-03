# 🔧 Regra de Negócio - Auto-conclusão de Invoice Quando Todos Produtos Perdidos

## Requisito

Quando uma invoice está **paga** (`paid: true`) e **todos os produtos são marcados como perdidos**, e **não há produtos em análise** (`quantityAnalizer === 0` para todos), a invoice deve ser **automaticamente marcada como concluída** (`completed: true`), **sem necessidade de ação manual do usuário**.

## Regra de Negócio

```
SE invoice.paid === true
E todos os produtos foram marcados como perdidos (invoice.products.length === 0 OU todos os produtos foram removidos)
E não há produtos em análise (todos os produtos têm quantityAnalizer === 0 OU não existem produtos)
ENTÃO invoice.completed = true (AUTOMÁTICO, sem confirmação)
```

## Contexto

Atualmente, mesmo quando todos os produtos de uma invoice são marcados como perdidos, a invoice não é automaticamente concluída. O usuário precisa manualmente confirmar ou executar alguma ação para marcar a invoice como concluída.

### Comportamento Esperado

1. Invoice está criada com produtos
2. Invoice é marcada como **paga** (`paid: true`)
3. Usuário marca **todos os produtos como perdidos** via `POST /invoice/lost-products`
4. Backend remove produtos da invoice (conforme `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REMOVER_DA_INVOICE.md`)
5. Invoice fica sem produtos (`products.length === 0`) OU todos os produtos foram removidos
6. **AUTOMÁTICO:** Backend verifica se `paid === true` e `products.length === 0`, então marca `completed = true`
7. **NÃO é necessário** que o usuário confirme "Receber Todos" ou qualquer outra ação

## Solução Necessária

### Implementar no Endpoint de Lost Products

No endpoint `POST /invoice/lost-products`, após criar o produto perdido e remover/atualizar o produto da invoice, verificar se a invoice deve ser automaticamente concluída:

```typescript
// Após criar o lostProduct e remover/atualizar o invoiceProduct
await prisma.lostProduct.create({...});
await prisma.invoiceProduct.delete({...}); // ou update (conforme PROMPT_BACKEND_PRODUTOS_PERDIDOS_REDUZIR_QUANTIDADE_PARCIAL.md)

// Buscar a invoice atualizada
const updatedInvoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: {
    products: true
  }
});

// Verificar se invoice está paga e não tem mais produtos
if (updatedInvoice.paid && updatedInvoice.products.length === 0) {
  // Verificar se não há produtos em análise (quantidadeAnalizer === 0 para todos)
  // Como não há mais produtos, essa condição já é satisfeita

  // Marcar como concluída AUTOMATICAMENTE (sem confirmação do usuário)
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { completed: true }
  });
}
```

### Considerações Adicionais

**Casos onde NÃO deve marcar como concluída automaticamente:**

1. Invoice **não está paga** (`paid === false`)
2. Ainda há produtos na invoice (`products.length > 0`)
3. Ainda há produtos em análise (`quantityAnalizer > 0` para algum produto)

**Casos onde DEVE marcar como concluída automaticamente:**

1. Invoice está **paga** (`paid === true`)
2. **Todos os produtos foram marcados como perdidos** (`products.length === 0`)
3. Não há produtos em análise (já que não há produtos)

## Casos de Teste

1. ✅ Invoice paga com 1 produto → marca produto como perdido → invoice deve ficar concluída automaticamente
2. ✅ Invoice paga com 3 produtos → marca todos como perdidos → invoice deve ficar concluída automaticamente
3. ✅ Invoice não paga com produtos → marca todos como perdidos → invoice **NÃO** deve ficar concluída (só paga pode ficar concluída)
4. ✅ Invoice paga com produtos → marca alguns como perdidos (não todos) → invoice **NÃO** deve ficar concluída
5. ✅ Invoice paga com produtos em análise → marca produtos como perdidos → se ainda há produtos em análise, **NÃO** concluir
6. ✅ Invoice paga com produtos → marca todos como perdidos → **SEM confirmação do usuário**, invoice é concluída automaticamente

## Integração com Outras Regras

Esta regra complementa as regras já documentadas em:

- `PROMPT_BACKEND_INVOICE_CONCLUIDA_QUANDO_PERDIDOS.md` - Regra similar, mas essa nova regra enfatiza que deve ser **automático**, sem confirmação
- `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REMOVER_DA_INVOICE.md` - Remoção de produtos da invoice
- `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REDUZIR_QUANTIDADE_PARCIAL.md` - Redução parcial de quantidade

## Prioridade

**ALTA** - Melhora significativamente a experiência do usuário, eliminando passos desnecessários.

## Impacto

- **Front-end:** Não precisa fazer nada, a invoice será automaticamente marcada como concluída no backend
- **UX:** Melhor experiência, menos cliques e confirmações desnecessárias
- **Consistência:** Garante que invoices sem produtos (todos perdidos) sejam marcadas como concluídas automaticamente
