import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jobrun-secret-key-change-in-production';

export interface ImpersonationToken {
  clientId: string;
  adminId: string;
  iat: number;
  exp: number;
}

/**
 * Generate a short-lived impersonation token (15 minutes)
 */
export function generateImpersonationToken(clientId: string, adminId: string = 'admin'): string {
  const payload: Omit<ImpersonationToken, 'iat' | 'exp'> = {
    clientId,
    adminId
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m' // 15 minutes
  });
}

/**
 * Verify and decode an impersonation token
 */
export function verifyImpersonationToken(token: string): ImpersonationToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ImpersonationToken;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: ImpersonationToken): boolean {
  return Date.now() >= token.exp * 1000;
}
