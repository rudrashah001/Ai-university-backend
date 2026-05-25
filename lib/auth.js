import { SignJWT, jwtVerify } from 'jose'
import { connectToDatabase } from './db.js'
import { User } from './models/User.js'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
)

export const COOKIE_NAME = 'sit-auth-token'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions)
}

export function removeAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export async function getCurrentUser(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  return verifyToken(token)
}

export async function registerUser(email, password, name) {
  try {
    await connectToDatabase()

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return { success: false, error: 'Email already registered' }
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'user',
    })

    return { success: true, user }
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: 'Registration failed' }
  }
}

export async function loginUser(email, password, res) {
  try {
    await connectToDatabase()

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return { success: false, error: 'Invalid credentials' }
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' }
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }

    const token = await createToken(payload)
    setAuthCookie(res, token)

    return { success: true, token, user: payload }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

export function logoutUser(res) {
  removeAuthCookie(res)
}
