/**
 * Busca por múltiplos termos: divide o texto por espaços e exige que TODOS os termos
 * apareçam no texto pesquisável (em qualquer ordem). Cada termo pode ser substring
 * em qualquer lugar OU início de alguma palavra.
 * Ex.: "15 pr" → acha "SEMINOVO 15 PRO 128GB"; "semi 15" → acha "SEMINOVO 15 PRO..."
 */
export function matchSearchTerms(searchTerm: string, searchableText: string): boolean {
  const searchLower = searchTerm.toLowerCase().trim();
  if (!searchLower) return true;

  const textLower = searchableText.toLowerCase().trim();
  const terms = searchLower.split(/\s+/).filter(Boolean);

  return terms.every((term) => {
    if (!term) return true;
    if (textLower.includes(term)) return true;
    const words = textLower.split(/\s+/);
    return words.some((word) => word.startsWith(term));
  });
}
