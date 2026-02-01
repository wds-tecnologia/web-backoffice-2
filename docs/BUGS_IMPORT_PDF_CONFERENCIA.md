# Bugs no Import PDF – Conferência (31/01/2026)

Documento para enviar ao backend junto com o PDF `public/Invoice 2272 (2).pdf` para conferência.

---

## Resumo do feedback do usuário

> "Tudo feito errado" – vários produtos com nomes errados, quantidades erradas, IMEIs incorretos e erro "Produto não encontrado" ao salvar.

---

## Produtos com erro (detalhado)

### 1. I15128P2 APPLE - IPHONE 15 128GB P2

**Retornado pelo backend:**
- Nome: `I15128P2 APPLE - IPHONE 15 128GB P2 02 PINK: BLACK`
- Qtd: 5
- IMEIs: 1

**Correto (conforme PDF):**
- **PINK:** 2 unidades, 2 IMEIs
- Nome não deve misturar "02 PINK:" e "BLACK"
- Só PINK nessa linha – BLACK é outra variante

**Problema:** Nome malformado (PINK + BLACK concatenados), quantidade errada (5 em vez de 2), IMEIs insuficientes (1 em vez de 2).

---

### 2. I15PRO256P2 APPLE - IPHONE 15 PRO 256GB BLACK

**Retornado pelo backend:**
- Nome: `I15PRO256P2 APPLE - IPHONE 15 PRO 256GB BLACK`
- Qtd: 5 (ou 10)
- IMEIs: 1

**Correto (conforme PDF):**
- **BLACK:** 5 unidades, 5 IMEIs
- **NATURAL:** 5 unidades, 5 IMEIs
- São **2 produtos separados** (BLACK e NATURAL)

**Problema:** Só retornou BLACK; NATURAL está faltando ou agregado. IMEIs insuficientes – deveria ter 5 para BLACK e 5 para NATURAL.

---

### 3. Produtos a verificar também

- **16 pro 256** (I16PRO256P2)
- **iPhone 15 128** (I15128P2)
- **17 pro 256**
- **17 pro max**

---

## Erro: "Produto(s) inválido(s). ID ou SKU não encontrado em Product"

**IDs/SKUs inválidos retornados pelo backend:**
- `SKU_BLACK`, `SKU_NATURAL`, `SKU_WHITE`, `SKU_DESERT`, `SKU_GOLD`, `SKU_SILVER`, `SKU_PURPLE`
- `353864166921157_NATURAL`, `353864166921157_BLACK`
- `353393819077670_NATURAL`, `353393819077670_BLACK`, `353393819077670_GOLD`, `353393819077670_SILVER`, `353393819077670_PURPLE`
- `357200606875255`, `359426262609575`

### Possíveis causas

1. **SKU_BLACK, SKU_NATURAL, etc.:** O backend está gerando `sku` como `"SKU"_COR` quando o SKU base está ausente ou inválido. A tabela Product não tem esses códigos.

2. **353864166921157_NATURAL, 353393819077670_BLACK, etc.:** O `id` ou `sku` está sendo montado como `IMEI_COR` – incorreto. O IMEI não deve ser usado como identificador de produto.

3. **Frontend envia** `productId: p.validation?.productId || p.sku`. Se o produto não foi vinculado pelo usuário, envia o `sku` retornado pelo backend. Se o backend retorna `I15PRO256P2_BLACK`, o Product table pode ter só `I15PRO256P2` – o backend precisa aceitar variante e mapear para o produto base, ou o frontend precisa exigir vínculo antes de salvar.

### Ação sugerida no backend

1. **Nunca** usar IMEI como parte de `sku` ou `id` de produto.
2. **Nunca** usar `"SKU"` como placeholder – usar o SKU base real ou sinalizar ausência.
3. Ao resolver productId em `invoices/create`: se receber `I15PRO256P2_BLACK`, tentar fallback para `I15PRO256P2` (remover `_COR`) antes de retornar 400.
4. Garantir que `expandProductsByVariants` use o SKU base real do produto, não placeholders.

---

## PDF de referência

**Arquivo:** `public/Invoice 2272 (2).pdf`  
**Caminho no projeto:** `D:\Atacadao 2025\Black Rabbit\web-backoffice-2\public\Invoice 2272 (2).pdf`

Usar este PDF para conferir a estrutura real da DESCRIPTION e validar o parser.

---

## Regra correta de separação (relembrar)

1. Linha `[QTD] [COR]:` (ex.: `02 PINK:`, `05 BLACK:`, `05 NATURAL:`) → inicia **novo produto**.
2. Próximas N linhas com 15 dígitos → IMEIs **desse** produto (N = quantidade da variante).
3. Cada variante = 1 produto separado no array.

**Exemplo correto para I15PRO256P2:**
```
05 BLACK:
[5 IMEIs]
05 NATURAL:
[5 IMEIs]
```
→ **2 produtos:** BLACK (qty 5, 5 IMEIs) e NATURAL (qty 5, 5 IMEIs).

---

## Referências

- `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md` – regras, regex, exemplos e casos que falham
- `docs/PROMPT_BACKEND_IMPORT_PDF.md` – fluxo geral do import
