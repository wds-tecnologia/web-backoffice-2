# Backend: Import PDF – AFI WIRELESS (modelo alternativo por pagina)

**Objetivo:** suportar o modelo alternativo da AFI WIRELESS em que a invoice vem com **1 produto por folha** e a lista de IMEIs pode continuar nas paginas seguintes.

---

## PDF de referencia

- `Inv_18525_from_AFI_WIRELESS_INC_90480.pdf`

Pontos observados no arquivo:

- Mesmo cabecalho repetido em todas as paginas.
- Bloco de produto principal:
  - `16 128 GB IPHONE INDIA SPEC`
  - cores/variantes: `Black 30`, `White 25`, `Pink 5`
  - IMEIs distribuidos entre as paginas 1, 2 e 3.
- Segundo bloco:
  - `15 128 GB IPHONE USA SPEC`
  - variante: `60 BLUE`
  - IMEIs distribuidos entre as paginas 4, 5 e 6.
- Pagina final com `MISCELAN... Delivery Fee` (nao deve virar produto).

---

## Regras de extracao (AFI alternativo)

1. Detectar automaticamente fornecedor AFI (`AFI WIRELESS INC`) e acionar o parser alternativo.
2. Tratar a invoice como um fluxo continuo entre paginas (nao reiniciar estado por pagina).
3. Reconhecer inicio de produto por descricao (ex.: `16 128 GB IPHONE INDIA SPEC`).
4. Reconhecer variantes:
   - `Black 30` (cor + quantidade)
   - `60 BLUE` (quantidade + cor)
5. Coletar IMEIs de 15 digitos nas linhas seguintes, inclusive quando continuarem na pagina seguinte.
6. Encerrar coleta do produto atual quando detectar:
   - nova variante valida do mesmo produto, ou
   - novo produto, ou
   - linha de totais/rate/amount do bloco, ou
   - item de servico/taxa (`MISCELAN... Delivery Fee`).
7. Nao incluir texto de servico, garantia, rodape ou totais como produto.

---

## Contrato de resposta (sem mudanca)

Manter exatamente o retorno atual de `POST /invoice/import-from-pdf`:

- `invoiceData`
- `products`
- `summary`

Para cada item em `products`:

- `name`
- `quantity`
- `rate`
- `amount`
- `imeis` (array)
- `validation`

---

## Comportamento esperado para esse modelo

1. Produtos devem vir expandidos por variante/cor.
2. Cada variante deve trazer seus IMEIs extraidos.
3. `quantity` x `imeis.length` deve ficar consistente quando o PDF trouxer lista completa.
4. Quando houver duvida de OCR/extracao, o front continua permitindo revisao e edicao manual antes de salvar.

---

## Criterios de aceite

- `pdfSupplierName = "AFI WIRELESS INC"`.
- `products` contem variantes corretas (ex.: INDIA SPEC BLACK/WHITE/PINK e USA SPEC BLUE).
- IMEIs extraidos por variante, mesmo quando distribuidos em varias paginas.
- `MISCELAN... Delivery Fee` nao aparece em `products`.
- Sem regressao nos formatos anteriores (iPhone/Watch/variantes ja suportados).

---

## Arquivos backend sugeridos

- `product-extractor.ts`
- `variant-expander.ts`
- `imeis/utils.ts`
- `import-pdf.ts`

