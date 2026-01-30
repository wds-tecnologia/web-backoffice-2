# Resposta / Prompt para o Backend – PUT de Listas de Compras (preservar itens por itemId)

Este documento é a **resposta** e a especificação oficial para o backend implementar o PUT preservando itens por `itemId`. Use como prompt para o time de back.

**Objetivo:** Alterar o `PUT /invoice/shopping-lists/:id` para **preservar** itens existentes quando o front enviar `itemId`, em vez de deletar todos e recriar. Assim, `receivedQuantity`, `status` e `purchased` dos itens já existentes não são zerados e o usuário não perde o status de "comprado".

O **front já está enviando `itemId`** em todos os PUTs quando o item já existe (edição de lista, edição de quantidade, transferência com merge, transferência criando novo item). O front também **detecta** se o backend preservou os ids; se sim, não roda o loop de restauração (vários PATCHs). Ou seja: o front está pronto. Falta o backend implementar o contrato abaixo.

---

## Contrato do PUT

**Endpoint:** `PUT /invoice/shopping-lists/:id`  
**Body:** `{ name?, description?, items }`  
**`items`:** array de objetos. Cada objeto pode ter:

| Campo      | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `productId` | sim        | ID do produto |
| `quantity`  | sim        | Quantidade |
| `notes`     | não        | Observações |
| **`itemId`** | **não**    | **ID do `ShoppingListItem` existente (UUID/string). Se vier preenchido, o backend deve ATUALIZAR esse item em vez de criar um novo.** |

### Regras de negócio

1. **Se o item no body tiver `itemId`** (e esse `itemId` existir na lista com o mesmo `shoppingListId`):
   - **Atualizar** o `ShoppingListItem` existente com esse id.
   - Alterar apenas: `productId`, `quantity`, `notes` (conforme o body).
   - **Preservar** todos os demais campos: `receivedQuantity`, `status`, `purchased`, `purchasedAt`, `receivedAt`, `defectiveQuantity`, `returnedQuantity`, `finalQuantity`, etc. **Não zerar.**

2. **Se o item no body NÃO tiver `itemId`** (ou o `itemId` não existir/não pertencer à lista):
   - **Criar** um novo `ShoppingListItem` com os valores do body e valores padrão do schema (`receivedQuantity = 0`, `status = "PENDING"`, etc.).

3. **Itens que existiam na lista e não vieram no body:**  
   - **Deletar** esses itens (comportamento atual: a lista passa a ser exatamente o que veio em `items`).

4. **Ordem:**  
   - A ordem dos itens na resposta deve refletir a ordem do array `items` no body (itens atualizados mantêm a posição; itens novos vão nas posições em que foram enviados).

### Resumo em uma frase

- **Com `itemId`** → UPDATE no item existente (só `productId`, `quantity`, `notes`); resto preservado.  
- **Sem `itemId`** → INSERT (novo item com valores padrão).  
- **Itens da lista que não estão no body** → DELETE.

### Exemplo

**Lista atual:**  
Item A (id: `uuid-a`, receivedQuantity: 5), Item B (id: `uuid-b`, receivedQuantity: 0).

**Body do PUT:**  
`items: [ { itemId: "uuid-a", productId: "...", quantity: 10, notes: "" }, { productId: "...", quantity: 2, notes: "novo" } ]`

**Resultado esperado:**  
1. Item `uuid-a` atualizado: quantity = 10, **receivedQuantity continua 5** (preservado).  
2. Novo item criado: quantity = 2, receivedQuantity = 0.  
3. Item B (`uuid-b`) foi removido da lista (não veio no body).

---

## Validações sugeridas

- Se `itemId` vier no body, validar que existe e pertence à lista (`shoppingListId` do item = `:id` da URL). Caso contrário, tratar como item novo (criar) ou retornar 400 com mensagem clara.
- Manter compatibilidade: se **nenhum** item tiver `itemId`, o backend pode continuar fazendo deleteMany + createMany como hoje (comportamento legado); o front envia `itemId` em todos os fluxos atuais, então na prática sempre virá `itemId` para itens existentes.

---

## Front (já feito)

- Envia `itemId` em todos os PUTs quando o item já existe (edição de lista, edição de quantidade, transferência com merge, transferência com novo item).
- Após o PUT, detecta se o backend preservou: se os ids e `receivedQuantity` dos itens comprados continuam iguais, considera "backend novo" e **não** executa o loop de restauração (vários PATCHs). Caso contrário, executa a restauração como antes.
- Usuários não são impactados: com backend antigo o comportamento segue igual; com backend novo, menos chamadas e sem "piscar" de status de comprado.

Quando o backend implementar esse contrato, o front já estará compatível; não é necessário mudar nada no front.
