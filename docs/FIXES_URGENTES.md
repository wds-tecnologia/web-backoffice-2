# Correções Urgentes - Data e IMEIs

## Problema Reportado

1. **Data invertida**: Invoices salvas no banco com data `"2025-28-11"` (YYYY-DD-MM) ao invés de `"2025-11-28"` (YYYY-MM-DD)
2. **IMEIs errados**: OCR extraindo IMEIs incorretamente, impedindo salvar a invoice

---

## Solução 1: Correção Defensiva de Datas (Frontend)

### Problema
Invoices antigas no banco têm datas invertidas. Mesmo com backend corrigido para imports novos, as invoices existentes ainda causam erro no navegador:
```
The specified value "2025-28-11" does not conform to the required format, "yyyy-MM-dd"
```

### Solução
Adicionada função `fixInvertedDate()` no frontend que detecta e corrige datas invertidas automaticamente ao carregar invoices do histórico.

**Arquivo:** `src/pages/gestao-invoices/components/sections/InvoiceHistory.tsx`

**Lógica:**
```javascript
const fixInvertedDate = (date: string): string => {
  const [_, year, part1, part2] = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const num1 = parseInt(part1, 10);
  const num2 = parseInt(part2, 10);
  
  // Se part1 > 12, está invertido (dia no lugar do mês)
  if (num1 > 12 && num2 <= 12) {
    return `${year}-${part2}-${part1}`; // Corrige para YYYY-MM-DD
  }
  
  return date;
}
```

**Aplicação:**
- Ao carregar invoices: `fetchInvoicesAndSuppliers()`
- Campos corrigidos: `date`, `paidDate`, `completedDate`
- Log no console: `⚠️ [DATE FIX] Data invertida detectada: ...`

### Resultado
✅ Invoices antigas com datas invertidas agora carregam corretamente  
✅ Campo de data aceita o valor e não gera erro no navegador  
✅ Novas invoices do backend (com fix) continuam funcionando  

---

## Solução 2: Validação Relaxada de IMEIs

### Problema
Validação bloqueava salvar invoices com quantidade de IMEIs ≠ quantidade de produtos. Quando o OCR extrai IMEIs errados (falta ou sobra), a invoice não pode ser salva.

### Solução
Mudança de **bloqueio** para **aviso com confirmação**.

**Arquivos:**
- `src/pages/gestao-invoices/components/modals/ReviewPdfModal.tsx`
- `src/pages/gestao-invoices/components/modals/MultiInvoiceReviewModal.tsx`

**Antes:**
```javascript
if (imeisInvalid) {
  Swal.fire({ title: "IMEIs Inválidos", ... });
  return; // ❌ Bloqueia salvar
}
```

**Agora:**
```javascript
if (imeisInvalid.length > 0) {
  const result = await Swal.fire({
    title: "⚠️ Aviso: IMEIs Inconsistentes",
    html: `...detalhes dos produtos com problema...`,
    showCancelButton: true,
    confirmButtonText: "Sim, continuar",
    cancelButtonText: "Cancelar",
  });
  
  if (!result.isConfirmed) {
    return; // ✅ Usuário escolhe
  }
}
// Continua salvando
```

**Modal de Aviso:**
- Lista produtos com problema (nome + quantidade de IMEIs vs quantidade de produtos)
- Permite continuar ou cancelar
- IMEIs são salvos "como estão" se o usuário confirmar
- Usuário pode ajustar depois manualmente

### Resultado
✅ Invoices com IMEIs errados podem ser salvas (com confirmação)  
✅ Usuário vê claramente quais produtos têm problema  
✅ IMEIs salvos no banco mesmo com inconsistência  
✅ Possível corrigir depois (edição ou re-importação)  

---

## Status dos Bugs Críticos

| Bug | Backend | Frontend |
|-----|---------|----------|
| Data MM/DD/YYYY → YYYY-MM-DD | ✅ Corrigido (novos imports) | ✅ Correção defensiva (dados antigos) |
| Separação de variantes (cores) | ✅ Corrigido (`expandProductsByVariants`) | ✅ Pronto para receber |
| IMEIs bloqueando salvar | 🟡 OCR precisa melhorar | ✅ Validação relaxada |

---

## Próximos Passos (Backend - Urgente)

### 1. Corrigir Datas no Banco (Migração)
Executar script SQL para corrigir invoices existentes:
```sql
UPDATE invoices
SET date = CONCAT(
  SUBSTRING(date, 1, 4), '-',
  SUBSTRING(date, 9, 2), '-',
  SUBSTRING(date, 6, 2)
)
WHERE date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  AND CAST(SUBSTRING(date, 6, 2) AS UNSIGNED) > 12;
```

### 2. Melhorar OCR de IMEIs
O parsing de IMEIs precisa ser mais robusto:
- Detectar melhor linhas de 15 dígitos
- Ignorar linhas com texto mesclado (ex: `***P2 A***`)
- Separar IMEIs por variante corretamente
- Validar quantidade por variante

Ver: `docs/PROMPT_BACKEND_IMPORT_PDF_VARIANTS.md` para o algoritmo atualizado.

---

## Logs para Debug

### Frontend - Data Corrigida
```
⚠️ [DATE FIX] Data invertida detectada: 2025-28-11 → 2025-11-28
```

### Frontend - IMEI Inconsistente (ao salvar)
```
Modal: ⚠️ Aviso: IMEIs Inconsistentes

APPLE - IPHONE 15 PRO 256GB BLACK: 3 IMEIs para 5 produtos
APPLE - IPHONE 15 PRO 256GB NATURAL: 7 IMEIs para 5 produtos

[Sim, continuar] [Cancelar]
```

---

## Arquivos Modificados

1. `src/pages/gestao-invoices/components/sections/InvoiceHistory.tsx`
   - Adicionada `fixInvertedDate()`
   - Aplicada ao carregar invoices

2. `src/pages/gestao-invoices/components/modals/ReviewPdfModal.tsx`
   - Mudada validação de IMEIs (bloqueio → aviso)
   - `handleConfirm` agora é `async`

3. `src/pages/gestao-invoices/components/modals/MultiInvoiceReviewModal.tsx`
   - Mudada validação de IMEIs (bloqueio → aviso)
