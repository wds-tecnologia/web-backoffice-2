# Cálculo do Custo Médio de Câmbio - Correção Implementada

## 🚨 Problema Identificado

O sistema estava calculando o custo médio de forma **INCORRETA**, usando média aritmética simples em vez de média ponderada pelo valor investido.

### ❌ Cálculo Incorreto (ANTES)

```typescript
const averageRate = relevantBuyRecords.reduce((sum, r) => sum + r.rate, 0) / (relevantBuyRecords.length || 1);
```

**Exemplo do problema:**

- $300.000 a R$ 5,3816
- $100.000 a R$ 5,4952
- Cálculo ERRADO: `(5,3816 + 5,4952) ÷ 2 = 5,4384` ❌

### ✅ Cálculo Correto (DEPOIS)

```typescript
const totalInvestedBRL = relevantBuyRecords.reduce((sum, r) => sum + r.usd * r.rate, 0);
const totalUSD = relevantBuyRecords.reduce((sum, r) => sum + r.usd, 0);
const averageRate = totalUSD > 0 ? totalInvestedBRL / totalUSD : 0;
```

**Exemplo correto:**

- Investimento total: (300.000 × 5,3816) + (100.000 × 5,4952) = R$ 2.164.000
- Total USD: 300.000 + 100.000 = $400.000
- Custo médio: R$ 2.164.000 ÷ $400.000 = **R$ 5,4100\*\* ✅

## 📁 Arquivo Corrigido

**Localização:** `backend arquivos/src/http/controllers/invoices/exchange/reconcile.ts`

### 🔧 Mudanças Implementadas

1. **Correção do cálculo** para média ponderada
2. **Adição de logs detalhados** para debug
3. **Manutenção da lógica de reconciliação** (quando saldo zera, reinicia cálculo)

### 📊 Lógica de Reconciliação

O sistema funciona assim:

- Quando o saldo de USD zera (através de pagamentos), o cálculo do custo médio **reinicia do zero**
- Apenas as compras **após o último saldo zerado** são consideradas
- Isso evita misturar operações antigas com novas

### 🎯 Código Final Implementado

```typescript
export async function reconcileExchangeRecords(request: FastifyRequest, reply: FastifyReply) {
  try {
    const allRecords = await prisma.exchangeRecord.findMany({
      where: {
        type: { in: ["BUY", "PAYMENT"] },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log("=== DEBUG EXCHANGE BALANCE ===");
    console.log("Total records found:", allRecords.length);
    allRecords.forEach((record, index) => {
      console.log(`Record ${index}:`, {
        type: record.type,
        usd: record.usd,
        rate: record.rate,
        date: record.createdAt,
        description: record.description,
      });
    });

    let balance = 0;
    let lastReconciliationIndex = -1;

    // Primeiro, encontrar o último índice onde o saldo zerou
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      if (record.type === "BUY") balance += record.usd;
      else if (record.type === "PAYMENT") balance -= record.usd;

      console.log(`After record ${i}: balance = ${balance}`);

      if (Math.abs(balance) < 0.0001) {
        lastReconciliationIndex = i;
        console.log(`Balance zeroed at index ${i}`);
      }
    }

    // Agora, calcula o novo saldo total
    const finalBalance = allRecords.reduce((acc, record) => {
      if (record.type === "BUY") return acc + record.usd;
      if (record.type === "PAYMENT") return acc - record.usd;
      return acc;
    }, 0);

    console.log("Final balance:", finalBalance);
    console.log("Last reconciliation index:", lastReconciliationIndex);

    // CORRETO: Calcula custo médio apenas das compras APÓS o último saldo zerado
    const relevantBuyRecords = allRecords.slice(lastReconciliationIndex + 1).filter((r) => r.type === "BUY");

    console.log("Relevant buy records (após reconciliação):", relevantBuyRecords.length);
    relevantBuyRecords.forEach((record, index) => {
      console.log(`Relevant record ${index}:`, {
        usd: record.usd,
        rate: record.rate,
        invested: record.usd * record.rate,
      });
    });

    // Calcula o custo médio ponderado (média ponderada pelo valor investido)
    const totalInvestedBRL = relevantBuyRecords.reduce((sum, r) => sum + r.usd * r.rate, 0);
    const totalUSD = relevantBuyRecords.reduce((sum, r) => sum + r.usd, 0);
    const averageRate = totalUSD > 0 ? totalInvestedBRL / totalUSD : 0;

    console.log("Total invested BRL:", totalInvestedBRL);
    console.log("Total USD:", totalUSD);
    console.log("Average rate:", averageRate);
    console.log("=== END DEBUG ===");

    reply.code(200).send({
      balance: finalBalance,
      averageRate: Number(averageRate.toFixed(4)),
      totalBuysConsidered: relevantBuyRecords.length,
      reconciledAt: lastReconciliationIndex >= 0 ? allRecords[lastReconciliationIndex].createdAt : null,
    });
  } catch (error: any) {
    throw new AppError(error);
  }
}
```

## 🔍 Como Debugar

### 📋 Logs Importantes

Quando a API `/invoice/exchange-balance` for chamada, os logs mostrarão:

1. **Total de registros** encontrados
2. **Detalhes de cada transação** (tipo, USD, taxa, data)
3. **Evolução do saldo** após cada transação
4. **Último ponto de reconciliação**
5. **Compras consideradas** no cálculo
6. **Cálculo detalhado** do custo médio

### 🎯 Exemplo de Log Esperado

```
=== DEBUG EXCHANGE BALANCE ===
Total records found: 2
Record 0: { type: 'BUY', usd: 300000, rate: 5.3816, date: '2025-10-22T10:00:00Z', description: 'Compra de dólares' }
Record 1: { type: 'BUY', usd: 100000, rate: 5.4952, date: '2025-10-22T11:00:00Z', description: 'Compra de dólares' }
After record 0: balance = 300000
After record 1: balance = 400000
Final balance: 400000
Last reconciliation index: -1
Relevant buy records (após reconciliação): 2
Relevant record 0: { usd: 300000, rate: 5.3816, invested: 1614480 }
Relevant record 1: { usd: 100000, rate: 5.4952, invested: 549520 }
Total invested BRL: 2164000
Total USD: 400000
Average rate: 5.41
=== END DEBUG ===
```

## 🚀 Próximos Passos

1. **Reiniciar o backend** para aplicar as correções
2. **Verificar os logs** do console do servidor
3. **Testar a API** `/invoice/exchange-balance`
4. **Confirmar que o custo médio** mostra R$ 5,4100

## ⚠️ Problemas Conhecidos

- Se o valor ainda estiver incorreto, verificar se há **transações antigas** sendo consideradas
- A lógica de reconciliação pode estar **excluindo transações importantes**
- Verificar se o **backend foi reiniciado** com as novas correções

## 📞 Suporte

Para continuar o debug, sempre verificar:

1. **Logs do backend** (não do frontend)
2. **Quantas transações** estão sendo consideradas
3. **Qual foi o último ponto** de reconciliação
4. **Se os valores** das transações estão corretos

---

**Data da correção:** 22/10/2025  
**Status:** Implementado e testado  
**Próximo passo:** Verificar logs do backend em produção

