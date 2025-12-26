export const safeInitial = (value?: string | null, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.charAt(0) : fallback;
};
