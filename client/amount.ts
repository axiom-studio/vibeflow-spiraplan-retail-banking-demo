export function parseAmount(value: string): number | undefined {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value.trim())) return undefined;
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : undefined;
}
