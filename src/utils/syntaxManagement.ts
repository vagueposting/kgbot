export function snakeToCamel(str: string) {
  str.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function normalizeTitleCase<T extends string>(value: string): T {
  const trimmed = value.trim();
  return (trimmed.charAt(0).toUpperCase() +
    trimmed.slice(1).toLowerCase()) as T;
}
