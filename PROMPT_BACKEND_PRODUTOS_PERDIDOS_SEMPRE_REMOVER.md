# 🔧 Correção - Produtos Perdidos Devem SEMPRE Ser Removidos da Invoice

## Problema

Atualmente, quando um produto é marcado como perdido, o comportamento é inconsistente:
- **Alguns produtos** ficam na lista com quantidade 0 e o botão "Analisar" fica bloqueado
- **Outros produtos** somem completamente da lista e vão para a lista de perdidos

Isso cria confusão e inconsistência na interface.

## Requisito

**TODOS os produtos marcados como perdidos devem ser REMOVIDOS COMPLETAMENTE da invoice**, independentemente de ser perda parcial ou total. O produto **NÃO deve mais aparecer** na lista de produtos pendentes, nem com quantidade 0.

### Comportamento Esperado (Padrão Único)

Quando um produto é marcado como perdido (via `POST /invoice/lost-products`):

1. ✅ Produto é criado na tabela `LostProduct`
2. ✅ Produto é **DELETADO COMPLETAMENTE** da invoice (removido da lista)
3. ✅ Produto **NÃO aparece mais** em:
   - "Produtos Pendentes"
   - "Produtos Pendentes de Análise"
   - "Produtos Recebidos"
4. ✅ Produto **aparece apenas** em:
   - Aba "Produtos Perdidos"

**IMPORTANTE:** Isso se aplica tanto para perda **parcial** quanto para perda **total**.

## Exemplos

### Exemplo 1: Perda Parcial

**Cenário:**
- Invoice tem produto com **6 unidades**
- Usuário marca **2 unidades como perdidas**

**Comportamento Esperado:**
- LostProduct é criado com `quantity: 2`
- InvoiceProduct é **DELETADO** da invoice (não reduzido)
- Produto **sai completamente** da lista de produtos pendentes
- As 4 unidades restantes **não aparecem** na invoice (foram consideradas como "restantes não entregues")

**Código esperado:**
```typescript
// POST /invoice/lost-products
await prisma.lostProduct.create({
  data: {
    invoiceProductId: invoiceProduct.id,
    invoiceId: invoiceProduct.invoiceId,
    productId: invoiceProduct.productId,
    quantity: quantityLost, // quantidade perdida (pode ser parcial)
    // ... outros campos
  }
});

// SEMPRE deletar o produto da invoice, independentemente de ser perda parcial ou total
await prisma.invoiceProduct.delete({
  where: { id: invoiceProductId }
});
```

### Exemplo 2: Perda Total

**Cenário:**
- Invoice tem produto com **6 unidades**
- Usuário marca **6 unidades como perdidas** (ou todas)

**Comportamento Esperado:**
- LostProduct é criado com `quantity: 6`
- InvoiceProduct é **DELETADO** da invoice
- Produto **sai completamente** da lista

**Código esperado:**
```typescript
// POST /invoice/lost-products
await prisma.lostProduct.create({
  data: {
    invoiceProductId: invoiceProduct.id,
    invoiceProductId: invoiceProduct.invoiceId,
    productId: invoiceProduct.productId,
    quantity: quantityLost, // quantidade perdida (total)
    // ... outros campos
  }
});

// SEMPRE deletar o produto da invoice
await prisma.invoiceProduct.delete({
  where: { id: invoiceProductId }
});
```

## Regra de Negócio

```
QUANDO produto é marcado como perdido:
1. Criar registro em LostProduct com a quantidade perdida
2. DELETAR InvoiceProduct completamente (não reduzir quantidade)
3. Produto não deve mais aparecer na invoice
```

## Por Que Sempre Deletar?

1. **Consistência:** Todos os produtos perdidos terão o mesmo comportamento
2. **Clareza:** Produto com quantidade 0 causa confusão na interface
3. **UX:** Usuário prefere que produtos perdidos sumam completamente da lista
4. **Simplicidade:** Não precisa lidar com lógica de redução parcial

## Impacto

- **Backend:** Sempre deletar InvoiceProduct quando produto é marcado como perdido
- **Frontend:** Produtos perdidos não aparecerão mais na lista (comportamento esperado)
- **UX:** Interface mais limpa e consistente

## Observação

Se houver necessidade futura de permitir perda parcial mantendo o produto na invoice, isso pode ser implementado como uma funcionalidade separada. Por enquanto, o padrão é: **produto perdido = produto removido completamente**.

## Prioridade

**ALTA** - Inconsistência está causando confusão na interface.

## Relacionado

- Substitui/atualiza a lógica em `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REDUZIR_QUANTIDADE_PARCIAL.md`
- Integra com `PROMPT_BACKEND_PRODUTOS_PERDIDOS_REMOVER_DA_INVOICE.md`

