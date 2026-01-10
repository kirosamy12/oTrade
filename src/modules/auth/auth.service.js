import bcrypt from 'bcryptjs';
import User from '../users/user.model.js';
import { generateToken } from '../../config/jwt.js';

const SALT_ROUNDS = 10;

const register = async (userData) => {
  const { name, email, password, username } = userData;
  
  // Check if user already exists by email
  const existingUserByEmail = await User.findOne({ email });
  if (existingUserByEmail) {
    throw new Error('Email already registered');
  }
  
  // Check if username already exists
  const existingUserByUsername = await User.findOne({ username });
  if (existingUserByUsername) {
    throw new Error('Username already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Create user
  const user = new User({
    name,
    email,
    username,
    password: hashedPassword,
    role: 'user',
    subscriptionPlan: 'free'
  });
  
  await user.save();
  return { 
    message: 'User registered successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan
    }
  };
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
    userType: 'user',
    role: user.role,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionExpiry: user.subscriptionExpiry
  });
  
  // Return user data (without password)
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan
    }
  };
};

export { register, login };