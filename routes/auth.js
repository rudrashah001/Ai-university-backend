import { Router } from 'express'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../lib/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const result = await registerUser(email, password, name)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    return res.status(201).json({ message: 'Registration successful' })
  } catch (error) {
    console.error('Register API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const result = await loginUser(email, password, res)

    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }

    return res.json({ message: 'Login successful', user: result.user })
  } catch (error) {
    console.error('Login API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', (req, res) => {
  try {
    logoutUser(res)
    return res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const user = await getCurrentUser(req)
    return res.json({ user: user || null })
  } catch (error) {
    console.error('Me API error:', error)
    return res.json({ user: null })
  }
})

export default router
