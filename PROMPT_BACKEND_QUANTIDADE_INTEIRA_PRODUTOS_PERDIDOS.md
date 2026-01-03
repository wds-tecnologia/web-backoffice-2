# 🔧 Correção Obrigatória - Quantidade DEVE ser Inteiro

## Problema

Produtos estão sendo salvos com quantidade fracionada (ex: 0.99, 1.50) quando **DEVE ser OBRIGATORIAMENTE número inteiro**.

**Regra:** Quantidade de produtos só pode ser: 1, 2, 3, 104, 267, 1001...
**NÃO pode ser:** 1.50, 0.99, 2.75 (como dinheiro ou porcentagem)

**Exemplo:**
- ❌ Errado: `0.99` unidades de iPhone
- ✅ Correto: `1` unidade de iPhone

## Causa

Quantidade está sendo tratada como decimal quando deveria ser sempre inteiro.

## Solução OBRIGATÓRIA

### 1. Validar como Inteiro no Back-end

No endpoint `POST /invoice/lost-products`, **validar e converter para inteiro**:

```typescript
// Validar que seja inteiro
const quantity = Number.parseInt(body.quantity, 10);

// OU validar no schema (Zod/Yup)
quantity: z.number().int().positive() // Zod - FORÇA inteiro
// ou
quantity: yup.number().integer().positive() // Yup - FORÇA inteiro

// Garantir que seja inteiro antes de salvar
const quantityToSave = Math.floor(Number(body.quantity)); // Sempre arredonda para baixo
```

**Importante:** Não usar `Math.round()` - use `Math.floor()` ou `Number.parseInt()` para garantir inteiro.

### Opção 2: Validar Quantidade Inteira

Adicionar validação no schema (Zod/Yup) para garantir que quantity seja inteiro:

```typescript
quantity: z.number().int().positive() // Zod
// ou
quantity: yup.number().integer().positive() // Yup
```

### Opção 3: Tipo no Prisma (se aplicável)

Se o campo `quantity` no modelo `LostProduct` permitir decimais mas deveria ser inteiro:

```prisma
model LostProduct {
  quantity Int  // Mudar de Float para Int
  // ...
}
```

**Nota:** Isso requer migração do banco de dados.

## Cálculo da Quantidade Disponível

Se o cálculo está gerando 0.99 ao invés de 1, verificar:

```typescript
// Cálculo que pode gerar 0.99
const available = product.quantity - product.quantityAnalizer - product.receivedQuantity;
// Resultado: 1 - 0.01 - 0 = 0.99

// Solução: Arredondar
const available = Math.round(product.quantity - product.quantityAnalizer - product.receivedQuantity);
// Resultado: Math.round(0.99) = 1
```

## Impacto

- **Front-end:** Já foi corrigido para arredondar a quantidade antes de enviar
- **Back-end:** Precisa arredondar ao receber e validar que seja inteiro

## Validação Recomendada

```typescript
// Schema de validação (Zod)
const createLostProductSchema = z.object({
  quantity: z.number().int().positive().min(1), // OBRIGATÓRIO: inteiro, positivo, mínimo 1
  // ...
});

// OU no Prisma (se aplicável)
model LostProduct {
  quantity Int  // Mudar de Float para Int (requer migração)
  // ...
}
```

## Prioridade

**ALTA** - Quantidade de produtos DEVE ser sempre inteiro. Não faz sentido ter 0.99 ou 1.50 unidades de um produto físico.

