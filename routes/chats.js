import { Router } from 'express'
import { getCurrentUser } from '../lib/auth.js'
import { connectToDatabase } from '../lib/db.js'
import { Chat } from '../lib/models/Chat.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return res.json({ chats: [] })
    }

    await connectToDatabase()

    const chats = await Chat.find({ userId: user.userId })
      .select('_id title updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    return res.json({
      chats: chats.map((chat) => ({
        id: chat._id.toString(),
        title: chat.title,
        updatedAt: chat.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get chats error:', error)
    return res.status(500).json({ error: 'Failed to fetch chats' })
  }
})

router.post('/', async (req, res) => {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const chat = await Chat.create({
      userId: user.userId,
      title: 'New Chat',
      messages: [],
    })

    return res.json({
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        updatedAt: chat.updatedAt,
      },
    })
  } catch (error) {
    console.error('Create chat error:', error)
    return res.status(500).json({ error: 'Failed to create chat' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await getCurrentUser(req)
    const { id } = req.params

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const chat = await Chat.findOne({ _id: id, userId: user.userId }).lean()

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    return res.json({
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        messages: chat.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        updatedAt: chat.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get chat error:', error)
    return res.status(500).json({ error: 'Failed to fetch chat' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const user = await getCurrentUser(req)
    const { id } = req.params

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const result = await Chat.deleteOne({ _id: id, userId: user.userId })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    return res.json({ message: 'Chat deleted' })
  } catch (error) {
    console.error('Delete chat error:', error)
    return res.status(500).json({ error: 'Failed to delete chat' })
  }
})

export default router
