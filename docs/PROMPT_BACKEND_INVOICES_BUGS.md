# Dúvidas / Ajustes para o Backend – Gestão de Invoices

Segue resumo dos bugs relatados e perguntas para o time de backend. Quando tiverem as respostas ou fizerem os ajustes, retorne para alinharmos o front.

---

## Respostas do Backend e alinhamento no front (atualizado)

- **1. Invoice Concluída:** Conclusão é automática no backend (`autoCompleteInvoiceIfNeeded`). Backend ajustou a regra para não depender de `received`/`lost`. **Front:** não precisa chamar nenhum endpoint extra; manter fluxo atual.
- **2. Histórico de recebimentos:** Backend retorna todos os registros com `id` único; resposta com `all` e `grouped`. **Front:** já usa `id` na deduplicação; no "Receber Todos" já envia **uma** atualização de produto e **uma** criação de histórico por produto com a quantidade recebida naquela ação (`quantityReceived`), alinhado à recomendação do backend.
- **3. Produtos perdidos:** Backend passou a não deletar mais o `InvoiceProduct`; valida `availableToLose` e não altera `quantityAnalizer` nem `receivedQuantity`. **Front:** fluxo atual (POST com `quantity` ≤ disponível) está correto; após marcar perdido, o front já recarrega a lista de invoices e a invoice selecionada.
- **4. Histórico mais rápido + bloqueio por tempo:** Backend expõe **um** endpoint por invoice (`GET /invoice/receipt-history/by-invoice/:invoiceId`) e aplica **bloqueio de 10s** (duplicata = mesmo produto + mesma quantidade + 10s), retornando headers `X-Receipt-History-Duplicate: true` e `X-Receipt-History-Dedup-Window-Seconds: 10`. **Front:** modal "Todos os Produtos Recebidos" usa **uma** chamada ao endpoint por invoice (com fallback para N chamadas por produto se falhar); ao criar recebimento ("Receber Todos"), trata 200 + header duplicata como sucesso e exibe mensagem informativa ("Recebimento já registrado").
- **5. Listas de Compras – PUT:** Backend **já preserva** `receivedQuantity`/status quando o front envia **`itemId`** em cada item existente no PUT. Com `itemId` → UPDATE (só `productId`, `quantity`, `notes`); sem `itemId` → INSERT; itens que não vêm no body → DELETE. Ordem da resposta = ordem do array `items`. **Front:** já envia `itemId` e detecta backend novo; não é necessário mudar nada; o loop de restauração (PATCH em lote) não será executado quando o backend preservar ids e `receivedQuantity`.

---

## 1. Invoice não vai para "Concluída" e continua como "Pago"

**Contexto:** Uma invoice foi paga e todos os produtos foram recebidos/finalizados, mas ela continua aparecendo como **Pago** em vez de **Concluída**.

**Regra no front:**  
- **Concluída** = `invoice.completed === true && invoice.paid === true`  
- **Pago** = `invoice.paid === true && invoice.completed === false`

**Perguntas para o backend:**
1. Quando todos os produtos da invoice estão recebidos (receivedQuantity = quantity para todos os itens), o backend está setando `completed = true` e `completedDate` na invoice?
2. Existe algum endpoint que o front deveria chamar para “marcar invoice como concluída” após receber todos os produtos, ou a conclusão é sempre automática no backend?
3. Se for automático, em quais fluxos isso é feito (ex.: último produto recebido, último produto “Receber Todos” em análise, marcação de perdido que zera pendências)?

Se a conclusão for automática e não estiver acontecendo nesse caso, precisamos garantir que, ao fechar a invoice (todos os produtos recebidos/perdidos/finalizados), o backend atualize `completed` e `completedDate`.

---

## 2. Histórico de Recebimentos – "Todos os Produtos Recebidos" com quantidade errada (17 em vez de 25)

**Contexto:** No modal "Histórico de Recebimentos" > "Todos os Produtos Recebidos", a quantidade exibida por data estava 17, mas a entrada real na invoice era 25 unidades (ex.: relógios).

**O que o front faz:**  
- Chama `GET /invoice/product/receipt-history/:invoiceProductId` para cada produto da invoice com `receivedQuantity > 0`.  
- Concatena as entradas, agrupa por data e exibe no modal.  
- No front foi feita deduplicação por chave (data/hora, invoice, quantidade, produto). Se o backend retornar um `id` único por registro de recebimento, o front usa esse `id` para não deduplicar entradas distintas.

**Perguntas para o backend:**
1. O endpoint `GET /invoice/product/receipt-history/:invoiceProductId` retorna **todos** os registros de recebimento daquele `invoiceProductId` (incluindo os criados em "Receber Todos" e em recebimentos parciais)?
2. Cada registro no histórico tem um `id` único? Se sim, o front já está usando esse `id` para evitar colapsar entradas diferentes.
3. Quando o usuário dá "Receber Todos" (várias quantidades de uma vez), o backend cria uma linha no receipt-history por produto/quantidade ou uma única linha agregada? Se for uma linha por “evento”, isso pode explicar diferença de contagem se algum evento não estiver sendo persistido.

---

## 3. Marcar 1 unidade como perdido remove os 3 que estavam "em análise"

**Contexto:** Havia 3 unidades de um produto em **análise** (pendentes de confirmação, `quantityAnalizer = 3`). O usuário marcou **1** unidade como **perdido**. O esperado era: 1 vai para a lista de perdidos e as 3 em análise continuam em análise. O que aconteceu: as 3 em análise sumiram e só ficou 1 na lista de perdidos.

**Fluxo no front:**  
- Na tela da invoice, em "Produtos Pendentes de Análise", o usuário clica em "Perdido" no produto.  
- O front envia `POST /invoice/lost-products` com algo como:  
  `{ invoiceId, productId, quantity: 1, freightPercentage: 0, notes }`.  
- A quantidade 1 é a que o usuário escolheu (máximo disponível no front é `quantity - quantityAnalizer - receivedQuantity`).

**Perguntas para o backend:**
1. Ao criar um registro em `lost-products` com `quantity: 1`, o backend está alterando o `invoice_product` desse produto?
2. O backend está zerando ou alterando o campo `quantityAnalizer` ao marcar perdido? O esperado é **não** alterar `quantityAnalizer`. Apenas a quantidade **disponível** (não recebida e não em análise) é que deve ser debitada para perdido. Ou seja:  
   - Quantidade a debitar para perdido = `quantity - receivedQuantity - quantityAnalizer` (no caso, 1).  
   - Os 3 em análise (`quantityAnalizer`) devem permanecer 3 até o usuário "Receber" ou "Devolver" na análise.
3. O backend pode confirmar a regra: ao adicionar 1 perdido, deve-se apenas decrementar a quantidade “livre” do item (e criar o registro em lost_products), sem mexer em `quantityAnalizer` nem em `receivedQuantity`?

---

## 4. Histórico de Recebimentos – mais rápido e deduplicação ajustada

### Endpoint único por invoice (mais rápido)

Para o modal **"Histórico de Recebimentos"** (Todos os Produtos Recebidos), o front usa **uma única chamada** em vez de uma por produto:

- **`GET /invoice/receipt-history/by-invoice/:invoiceId`**

**Resposta:** formato já agrupado por data:

- `grouped`: array por data (date, quantity, entries)
- `all`: todos os registros de recebimento da invoice
- `totalReceivedFromInvoice`: soma dos `receivedQuantity` da invoice (ex.: 134)
- `invoiceNumber`: número da invoice

### Validação/bloqueio e deduplicação no backend

- **Janela de bloqueio:** 10 segundos. Só é considerada duplicata se for **mesmo produto + mesma quantidade + dentro de 10 segundos** (evita double-click sem engolir recebimentos legítimos).
- **Fallback:** Após 10 segundos, o backend sempre cria novo registro; o front pode reenviar.
- **Headers quando for duplicata:** `X-Receipt-History-Duplicate: true` e `X-Receipt-History-Dedup-Window-Seconds: 10`. O front trata 200 + esse header como “já registrado” e mostra mensagem informativa (ex.: “Recebimento já registrado”).

---

## 5. Listas de Compras – Transferência de produtos (PUT)

**Pergunta:** No **PUT** em `/invoice/shopping-lists/:id` com body `{ name, description, items }` (onde `items` é array de `{ productId, quantity, notes }` ou com **`itemId`** opcional), o backend **preserva** o `receivedQuantity` (e status) dos itens existentes ou **substitui** tudo e zera?

### Resposta do backend (atual)

O backend **já preserva** quando o front envia **`itemId`** em cada item que já existe na lista. Contrato implementado:

- **Cada item em `items` pode incluir `itemId` (opcional, UUID).**
- **Com `itemId`** (e o id existir na lista com o mesmo `shoppingListId`): o backend **atualiza** o item existente (apenas `productId`, `quantity`, `notes`); **preserva** `receivedQuantity`, `status`, `purchased`, `purchasedAt`, `receivedAt`, `defectiveQuantity`, `returnedQuantity`, `finalQuantity`, etc.
- **Sem `itemId`** (ou `itemId` inexistente/não pertencente à lista): o backend **cria** novo item (valores padrão do schema).
- **Itens da lista que não vêm em `items`:** o backend **remove** esses itens (a lista fica exatamente com os itens do body).
- **Ordem:** a resposta devolve `shoppingListItems` na **mesma ordem** do array `items` do body.

~~Ou seja: **`receivedQuantity` e status dos itens existentes não são preservados**~~; após o PUT, os itens da lista destino passam a ser “novos” (novos ids, receivedQuantity zerado, status PENDING). Isso pode causar o “piscar” ou perda do status de comprado na tela.

Assim, ao transferir/juntar listas via PUT, os itens existentes da lista destino que forem enviados com `itemId` **não** perdem `receivedQuantity` nem status; não é mais necessário o front compensar com PATCH em lote para esses itens. O front já envia `itemId` e detecta se o backend preservou; com o backend atual, a detecção deve considerar "backend novo" e não executar o loop de restauração.

Contrato detalhado: **`docs/PROMPT_BACKEND_SHOPPING_LISTS_PUT.md`**.

---

- **Payload do PUT** (referência) em `/invoice/shopping-lists/:id`: cada elemento de `items` pode incluir **`itemId`** (opcional). Se **`itemId`** for enviado: **atualizar** o item existente (alterar `productId`, `quantity`, `notes`), **preservando** `receivedQuantity`, `status`, `purchased`. Se **não** tiver `itemId`: criar **novo** item. Hoje, ao dar PUT na lista inteira, **todos** os itens são recriados com `receivedQuantity = 0`. O front só corrige o item que foi **mergeado** (ou o novo item criado) com um PATCH. Os **demais** itens da lista destino (que já tinham “comprado”) ficam com status zerado.
- **Front hoje (compatível com backend atual e futuro):** Envia **`itemId`** em todos os PUTs de lista quando o item já existe (edição de lista, edição de quantidade, transferência com merge, transferência criando novo item nos itens existentes). Após o PUT, **detecta** se o backend preservou ids: se os ids e `receivedQuantity` dos itens comprados continuam iguais, considera "backend novo" e **não** executa o loop de restauração (PATCH em lote). Caso contrário, executa a restauração como hoje. Usuários não são impactados: com backend antigo o comportamento segue igual; com backend novo, menos chamadas e sem "piscar" de status.
- **Especificação backend:** fazer o PUT **preservar** itens existentes (ex.: front enviar `itemId` para itens mantidos e backend atualizar em vez de recriar) evita zerar o “comprado” dos outros itens e reduz round-trips. Enquanto isso não for feito, o front mantém o PATCH após o PUT para o item mergeado/novo; foi ajustado para localizar o item mergeado por `productId` + nova quantidade (já que o PUT devolve novos ids).

---

## Resumo do que o front já ajustou

- **Relatórios (/invoices-management > Relatórios):** Range inicial de datas passou a ser de **3 meses**: do **dia 01** do mês inicial até o **dia atual** do 3º mês.
- **Histórico de Recebimentos:**  
  - No modal "Todos os Produtos Recebidos" foi adicionada a linha **"Quantidade total recebida (invoice): X"** (soma dos `receivedQuantity` ou `totalReceivedFromInvoice` do backend).  
  - Deduplicação passou a usar o `id` do registro de recebimento (quando existir) para não colapsar entradas distintas.  
  - Modal usa **uma** chamada **`GET /invoice/receipt-history/by-invoice/:invoiceId`** (com fallback para N chamadas por produto se o endpoint falhar).  
  - Ao criar recebimento ("Receber Todos"), se a resposta for 200 com header **`X-Receipt-History-Duplicate: true`**, o front trata como sucesso e exibe mensagem informativa ("Recebimento já registrado" / "Algumas entradas foram tratadas como duplicata...").
- **Listas de Compras – Transferência e edição:** O front envia **`itemId`** em todos os PUTs de lista quando o item já existe (edição de lista, edição de quantidade, transferência com merge, transferência criando novo item). Após o PUT, **detecta** se o backend preservou ids e `receivedQuantity`; se sim, não executa o loop de restauração (PATCH em lote). Ao juntar com item existente na transferência, envia o valor correto de comprado no PATCH (item destino + transferido); ao criar novo item, identifica o item recém-criado por id. Erro na transferência exibe a mensagem do backend quando existir.

Quando tiverem integrado no front, podemos revisar se falta algum ajuste ou regra de negócio.
