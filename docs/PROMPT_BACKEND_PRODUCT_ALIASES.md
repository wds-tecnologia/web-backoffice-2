# Backend: Sistema de Aliases de Produtos (Vínculo PDF → Banco)

## Problema

Quando importamos PDFs de invoices de fornecedores (ex.: EUA), os produtos vêm com nomes em inglês ou códigos específicos do fornecedor. Por exemplo:

- PDF: `"I15PRO256P2 APPLE - IPHONE 15 PRO 256GB"`
- Banco de dados: `"iPhone 15 Pro 256GB"`

Atualmente, o usuário precisa vincular **manualmente** cada produto toda vez que importa uma invoice. 

## Solução: Aliases Persistentes

Quando o usuário vincula um nome do PDF a um produto do banco, esse vínculo é **salvo e persistido**. Nas próximas importações, o sistema reconhece automaticamente o nome do PDF e já faz o match.

---

## Endpoints Necessários

### 1. POST `/invoice/product/alias` - Criar/Atualizar Alias

Salva o vínculo entre um nome do PDF e um produto do banco.

**Request:**
```json
{
  "pdfProductName": "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB",
  "productId": "uuid-do-produto-no-banco"
}
```

**Response 200:**
```json
{
  "id": "uuid-do-alias",
  "pdfProductName": "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB",
  "productId": "uuid-do-produto-no-banco",
  "productName": "iPhone 15 Pro 256GB",
  "createdAt": "2026-01-30T10:00:00Z"
}
```

**Regras:**
- `pdfProductName` deve ser normalizado: `trim().toLowerCase()` antes de salvar
- Se já existir um alias para o mesmo `pdfProductName`, atualizar o `productId`
- Um mesmo `productId` pode ter múltiplos aliases (ex.: diferentes fornecedores usam nomes diferentes para o mesmo produto)

---

### 2. GET `/invoice/product/aliases` - Listar Aliases

Lista todos os aliases cadastrados.

**Response 200:**
```json
{
  "aliases": [
    {
      "id": "uuid-1",
      "pdfProductName": "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB",
      "productId": "uuid-produto-1",
      "productName": "iPhone 15 Pro 256GB",
      "createdAt": "2026-01-30T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "pdfProductName": "SAMSUNG S24 ULTRA 512GB BLACK",
      "productId": "uuid-produto-2",
      "productName": "Galaxy S24 Ultra 512GB",
      "createdAt": "2026-01-30T10:05:00Z"
    }
  ]
}
```

---

### 3. DELETE `/invoice/product/alias/:id` - Remover Alias

Remove um alias pelo ID.

**Response 200:**
```json
{
  "message": "Alias removido com sucesso"
}
```

---

### 4. MODIFICAÇÃO em POST `/invoice/import-from-pdf`

O endpoint existente de importação de PDF deve agora **verificar aliases** antes de retornar os produtos.

**Fluxo atualizado:**

1. Parsear o PDF e extrair produtos
2. Para cada produto:
   a. Normalizar o nome: `product.name.trim().toLowerCase()`
   b. Buscar na tabela de aliases se existe match pelo `pdfProductName`
   c. Se encontrar alias:
      - Definir `validation.exists = true`
      - Definir `validation.productId = alias.productId`
      - Definir `validation.matchedByAlias = true` ← **NOVO CAMPO**
      - Definir `validation.aliasId = alias.id` ← **NOVO CAMPO**
   d. Se não encontrar alias, manter o comportamento atual (buscar por nome exato ou SKU)

**Novo formato de validation:**
```json
{
  "validation": {
    "exists": true,
    "productId": "uuid-do-produto",
    "divergences": [],
    "needsReview": false,
    "matchedByAlias": true,
    "aliasId": "uuid-do-alias"
  }
}
```

---

## Estrutura de Dados (Sugestão)

### Tabela: `product_alias`

| Campo           | Tipo      | Descrição                                    |
|-----------------|-----------|----------------------------------------------|
| id              | UUID      | Primary key                                  |
| pdf_product_name| VARCHAR   | Nome do produto como vem no PDF (normalizado)|
| product_id      | UUID      | FK para tabela de produtos                   |
| created_at      | TIMESTAMP | Data de criação                              |
| updated_at      | TIMESTAMP | Data de atualização                          |

**Índices:**
- `UNIQUE INDEX` em `pdf_product_name` (não pode ter dois aliases para o mesmo nome)
- `INDEX` em `product_id` (para buscar todos aliases de um produto)

---

## Algoritmo de Match (no import-from-pdf)

```javascript
async function matchProductWithAlias(pdfProductName) {
  // 1. Normalizar nome
  const normalized = pdfProductName.trim().toLowerCase();
  
  // 2. Buscar alias exato
  let alias = await db.productAlias.findOne({
    where: { pdfProductName: normalized }
  });
  
  // 3. Se não encontrou exato, tentar match parcial (opcional)
  if (!alias) {
    // Buscar aliases que contenham parte do nome ou vice-versa
    alias = await db.productAlias.findOne({
      where: {
        OR: [
          { pdfProductName: { contains: normalized } },
          // ou normalized contém pdfProductName
        ]
      }
    });
  }
  
  return alias;
}
```

---

## Fluxo no Frontend

1. Usuário importa PDF → produtos aparecem
2. Produto não reconhecido → usuário clica em "Vincular" e seleciona produto do banco
3. Ao vincular, frontend chama `POST /invoice/product/alias` com:
   - `pdfProductName`: nome original do PDF
   - `productId`: ID do produto selecionado
4. Próxima importação → backend reconhece automaticamente pelo alias
5. Produto aparece como "Vinculado automaticamente" (badge verde)

---

## Exemplo Prático

### Primeira importação:
```
PDF: "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB"
→ Não encontrado no banco
→ Usuário vincula manualmente a "iPhone 15 Pro 256GB" (id: abc-123)
→ Frontend salva alias: { pdfProductName: "i15pro256p2 apple - iphone 15 pro 256gb", productId: "abc-123" }
```

### Segunda importação (mesmo produto):
```
PDF: "I15PRO256P2 APPLE - IPHONE 15 PRO 256GB"
→ Backend busca alias → encontra match!
→ Retorna: validation.exists = true, validation.matchedByAlias = true
→ Frontend mostra: "✓ Vinculado automaticamente"
```

---

## Benefícios

1. **Automatização**: Produtos reconhecidos automaticamente nas próximas importações
2. **Consistência**: Garante que o mesmo produto do PDF sempre vai para o mesmo produto do banco
3. **Flexibilidade**: Um produto pode ter múltiplos aliases (diferentes fornecedores)
4. **Auditoria**: Registro de quando cada alias foi criado
5. **Manutenção**: Aliases podem ser editados/removidos se necessário

---

## Considerações de Performance

- A tabela de aliases tende a ser pequena (dezenas a centenas de registros)
- Pode ser cacheada em memória no início do processo de importação
- Match por nome normalizado é O(n), mas com índice único fica O(1)
