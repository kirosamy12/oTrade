import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export { generateToken, verifyToken };