export const buildAfiProductAliasVariants = (rawName: string): string[] => {
  const base = String(rawName || "").replace(/\s+/g, " ").trim();
  if (!base) return [];

  const variants = new Set<string>([base]);

  // Ex.: APPLE - IPHONE 16 128 GB INDIA SPEC BLACK -> APPLE - 128 GB IPHONE INDIA SPEC BLACK
  const legacyFromModel = base.replace(
    /^(.*?-\s*)?IPHONE\s+\d{1,2}\s+(\d{2,4})\s*GB\s+(.*)$/i,
    (_m, prefix, storage, rest) => `${prefix || ""}${storage} GB IPHONE ${rest}`.replace(/\s+/g, " ").trim()
  );
  variants.add(legacyFromModel);

  // Ex.: ... 128 GB IPHONE ... -> ... IPHONE 128 GB ...
  const normalizedIphonePosition = base.replace(
    /\b(\d{2,4})\s*GB\s+IPHONE\b/i,
    (_m, storage) => `IPHONE ${storage} GB`
  );
  variants.add(normalizedIphonePosition.replace(/\s+/g, " ").trim());

  return Array.from(variants).filter(Boolean);
};

