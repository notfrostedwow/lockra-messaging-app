import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
export function createSessionVerifier(issuer: string, audience: string, authorizedOrigins: string[], key?: JWTVerifyGetKey) {
  const url = new URL(issuer);
  if (url.protocol !== 'https:' || url.username || url.password || !audience || /example|placeholder/i.test(issuer)) throw new Error('Explicit signed-session issuer and calling audience required.');
  const publicKeys = key ?? createRemoteJWKSet(new URL('/.well-known/jwks.json', url));
  return async (token: string) => {
    const { payload } = await jwtVerify(token, publicKeys, {
      issuer, audience, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'sid', 'azp'], maxTokenAge: '2m', clockTolerance: 3,
    });
    // Browser calling contract: an omitted azp is never a native/client exemption.
    if (!payload.sub || typeof payload.sid !== 'string' || !payload.sid.trim() ||
      typeof payload.azp !== 'string' || !payload.azp.trim() || !authorizedOrigins.includes(payload.azp)) throw new Error('Calling session claims denied.');
    return payload.sub;
  };
}
