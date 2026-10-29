// Simple nanoid-like short ID generator (no external dependency needed at store level)
export function nanoid(size = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(size);
  crypto.getRandomValues(arr);
  for (const byte of arr) {
    result += chars[byte % chars.length];
  }
  return result;
}
