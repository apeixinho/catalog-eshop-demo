/** Builds a minimal JWT-shaped string readable by AuthService.decodeClaims. */
export function fakeJwt(payload: Record<string, unknown>, expiresInSec = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const body = btoa(JSON.stringify({ ...payload, exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.sig`;
}
