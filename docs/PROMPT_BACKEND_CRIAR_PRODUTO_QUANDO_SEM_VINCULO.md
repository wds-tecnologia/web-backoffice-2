# Backend: Criar produto quando não tiver vínculo (id null)

## Problema

Ao importar invoice via PDF, alguns produtos vêm sem `validation.productId` (não foram vinculados a um produto existente). O frontend envia `id: null` e o backend retorna erro:

```json
{
  "code": "invalid_type",
  "expected": "string",
  "received": "null",
  "path": ["products", 0, "id"]
}
```

## Solução desejada

**Quando `products[].id` for `null` ou vazio:** o backend deve **criar o produto** no banco de dados e usar o ID criado para a `InvoiceProduct`.

## Comportamento esperado em `POST /invoice/create`

Para cada item em `body.products`:

1. **Se `id` for string válida (UUID):** buscar o produto existente e usar normalmente.
2. **Se `id` for `null` ou string vazia:** criar um novo `Product` com:
   - `name` = `product.name` (obrigatório)
   - `code` = gerar ou usar `name` normalizado como fallback
   - `priceweightAverage` = `product.value` (valor unitário)
   - `weightAverage` = `product.weight` ou 0
   - `description` = "" ou derivado do name
   - `active` = true

3. Usar o `id` do produto (existente ou recém-criado) para criar a `InvoiceProduct`.

## Payload que o frontend envia (quando sem vínculo)

```json
{
  "products": [
    {
      "id": null,
      "name": "APPLE - IPHONE 16 PRO 256GB BLACK",
      "quantity": 5,
      "value": 690.00,
      "weight": 0,
      "total": 3450.00,
      "received": false,
      "receivedQuantity": 0,
      "imeis": ["353...", "354...", ...]
    }
  ]
}
```

## Regras

- Aceitar `id` como `null` ou string vazia.
- Quando `id` for null/vazio: criar `Product` e usar o novo ID.
- Manter validação de `supplierId` e demais campos.
- IMEIs: continuar salvando normalmente (já implementado).

## Referência

- Controller: `invoices/create.ts`
- Model: `Product`, `InvoiceProduct`
