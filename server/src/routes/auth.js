import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth, getJwtSecret } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';

const router = Router();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ message: 'Please enter your full name (at least 2 characters).' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (!password) return res.status(400).json({ message: 'Please enter a password.' });
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists. Please sign in instead.' });

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await User.hashPassword(password),
  });

  setAuthCookie(res, signToken(user));
  res.status(201).json({ message: 'Account created successfully.', user: user.toPublicJSON() });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Please enter your email and password.' });

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(String(password)))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  setAuthCookie(res, signToken(user));
  res.json({ message: `Welcome back, ${user.name}!`, user: user.toPublicJSON() });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'You have been signed out.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  const user = await User.findOne({ email: String(email).toLowerCase() });
  // Always answer the same way so attackers cannot probe which emails exist.
  const generic = { message: 'If an account exists for that email, a password reset link has been sent.' };
  if (!user) return res.json(generic);

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = hashToken(rawToken);
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5175';
  const resetUrl = `${clientUrl}/reset-password/${rawToken}`;
  const info = await sendPasswordResetEmail(user.email, resetUrl);

  // In development (no SMTP) also return the link so the flow is testable.
  if (!info.delivered && process.env.NODE_ENV !== 'production') {
    return res.json({ ...generic, devResetUrl: resetUrl });
  }
  res.json(generic);
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Reset token is missing.' });
  const passwordError = validatePassword(String(password || ''));
  if (passwordError) return res.status(400).json({ message: passwordError });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });

  const user = await User.findOne({
    resetTokenHash: hashToken(String(token)),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });

  user.passwordHash = await User.hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  setAuthCookie(res, signToken(user));
  res.json({ message: 'Password updated. You are now signed in.' });
});

// PUT /api/auth/profile - update name / bio / avatar (signed in users only)
router.put('/profile', requireAuth, async (req, res) => {
  const { name, bio, avatarUrl } = req.body || {};
  if (name !== undefined) {
    if (String(name).trim().length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    req.user.name = String(name).trim();
  }
  if (bio !== undefined) req.user.bio = String(bio).slice(0, 300);
  if (avatarUrl !== undefined) req.user.avatarUrl = String(avatarUrl).slice(0, 500);
  await req.user.save();
  res.json({ message: 'Profile updated.', user: req.user.toPublicJSON() });
});

export default router;
export { getJwtSecret };
