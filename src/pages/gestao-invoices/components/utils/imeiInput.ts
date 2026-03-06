export type IdentifierMergeResult = {
  merged: string[];
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type IdentifierInputPreview = {
  totalTokens: number;
  validCount: number;
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
  invalidTokens: string[];
};

const normalizeCandidate = (value: string): string => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const isValidImei = (value: string): boolean => /^\d{15}$/.test(value);

const isValidSerial = (value: string): boolean => /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10,15}$/.test(value);

const isValidIdentifier = (value: string): boolean => isValidImei(value) || isValidSerial(value);

const tokenizeIdentifiers = (input: string): string[] =>
  input
    .split(/[,\n;:]+/g)
    .flatMap((chunk) => chunk.split(/\s+/g))
    .map((item) => item.trim())
    .filter(Boolean);

export const previewIdentifiersInput = (existing: string[], input: string): IdentifierInputPreview => {
  const tokens = tokenizeIdentifiers(input);
  const normalizedExisting = existing.map(normalizeCandidate).filter(Boolean);
  const seen = new Set(normalizedExisting);

  const invalidTokens: string[] = [];
  let validCount = 0;
  let addedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const token of tokens) {
    const normalized = normalizeCandidate(token);
    if (!normalized || !isValidIdentifier(normalized)) {
      invalidCount += 1;
      invalidTokens.push(token);
      continue;
    }

    validCount += 1;
    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(normalized);
    addedCount += 1;
  }

  return {
    totalTokens: tokens.length,
    validCount,
    addedCount,
    duplicateCount,
    invalidCount,
    invalidTokens,
  };
};

export const mergeValidatedIdentifiers = (existing: string[], input: string): IdentifierMergeResult => {
  const tokens = tokenizeIdentifiers(input);
  const normalizedExisting = existing.map(normalizeCandidate).filter(Boolean);
  const merged = [...existing];
  const seen = new Set(normalizedExisting);

  let addedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const token of tokens) {
    const normalized = normalizeCandidate(token);
    if (!normalized || !isValidIdentifier(normalized)) {
      invalidCount += 1;
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalized);
    merged.push(normalized);
    addedCount += 1;
  }

  return {
    merged,
    addedCount,
    duplicateCount,
    invalidCount,
  };
};
