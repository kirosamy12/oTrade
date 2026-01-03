import bcrypt from 'bcrypt';
import User from '../users/user.model.js';
import { generateToken } from '../../config/jwt.js';

const SALT_ROUNDS = 10;

const register = async (userData) => {
  const { name, email, password } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Create user
  const user = new User({
    name,
    email,
    password: hashedPassword,
    role: 'user',
    subscriptionPlan: 'free'
  });
  
  await user.save();
  return { message: 'User registered successfully' };
};

const login = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }
  
  // Generate JWT token
  const token = generateToken({
    userId: user._id,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiry: user.subscriptionExpiry
  });
  
  // Return user data (without password)
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus
    }
  };
};

export { register, login };