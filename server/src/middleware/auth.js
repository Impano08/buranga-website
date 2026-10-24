import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const COOKIE_NAME = 'buranga_token';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to server/.env (see .env.example).');
  }
  return secret;
}

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, getJwtSecret(), { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE_NAME] || null;
}

/** Express middleware: attaches req.user when a valid session exists. */
export async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(payload.sub);
    }
  } catch (_err) {
    req.user = null;
  }
  next();
}

/** Express middleware: blocks the route unless the user is signed in. */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  next();
}
