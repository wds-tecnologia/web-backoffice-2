# 📋 Melhoria Necessária - Endpoint Histórico de Recebimento

## Contexto

O endpoint `GET /invoice/product/receipt-history/:invoiceProductId` retorna histórico agrupado por data, mas falta algumas informações importantes para exibição completa no front-end.

## Formato Atual (presumido)

```json
{
  "grouped": [
    {
      "date": "2025-01-15",
      "quantity": 150.5,
      "entries": [
        {
          "date": "2025-01-15T10:30:00Z",
          "quantity": 50.5
        },
        {
          "date": "2025-01-15T14:20:00Z",
          "quantity": 100
        }
      ]
    }
  ],
  "all": [...]
}
```

## Informações Necessárias

Cada entrada (`entry`) no array `entries` deve incluir:

1. **Nome do Operador/Usuário** que registrou o recebimento
   - Campo sugerido: `user.name` ou `operator.name` ou `userName`
   - Formato: string

2. **Número da Invoice**
   - Campo sugerido: `invoiceNumber`
   - Formato: string
   - Exemplo: "2248333"

3. **Data e Horário** (já existe, mas precisa estar completo)
   - Campo: `date` (já existe)
   - Deve incluir data E horário completo (incluindo segundos se possível)

## Formato Sugerido

```json
{
  "grouped": [
    {
      "date": "2025-01-15",
      "quantity": 150.5,
      "entries": [
        {
          "id": "uuid",
          "date": "2025-01-15T10:30:45Z",
          "quantity": 50.5,
          "user": {
            "id": "uuid",
            "name": "João Silva",
            "email": "joao@example.com"
          },
          "invoiceNumber": "2248333"
        },
        {
          "id": "uuid",
          "date": "2025-01-15T14:20:30Z",
          "quantity": 100,
          "user": {
            "id": "uuid",
            "name": "Maria Santos",
            "email": "maria@example.com"
          },
          "invoiceNumber": "2248333"
        }
      ]
    }
  ],
  "all": [...]
}
```

## Alternativa Simples

Se não houver relação direta, pode retornar:

```json
{
  "entries": [
    {
      "date": "2025-01-15T10:30:45Z",
      "quantity": 50.5,
      "userName": "João Silva",  // ou apenas nome
      "invoiceNumber": "2248333"
    }
  ]
}
```

## Benefícios

- ✅ Permite exibir informações completas no modal de histórico
- ✅ Melhor rastreabilidade de quem registrou cada recebimento
- ✅ Facilita auditoria e controle
- ✅ Melhor experiência do usuário

## Prioridade

**MÉDIA** - Funcionalidade já funciona, mas melhoraria a UX.

