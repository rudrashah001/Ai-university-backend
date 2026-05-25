import { Router } from 'express'
import { getCurrentUser } from '../lib/auth.js'
import { connectToDatabase } from '../lib/db.js'
import { WebsiteData } from '../lib/models/WebsiteData.js'
import { FAQ } from '../lib/models/FAQ.js'
import { generateEmbedding } from '../lib/rag.js'

const router = Router()

async function requireAdmin(req, res, next) {
  const user = await getCurrentUser(req)
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.user = user
  next()
}

router.use(requireAdmin)

// Website data
router.get('/website-data', async (req, res) => {
  try {
    await connectToDatabase()
    const data = await WebsiteData.find({}).select('-embedding').sort({ updatedAt: -1 }).lean()
    return res.json({
      data: data.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        content: d.content,
        category: d.category,
        url: d.url,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get website data error:', error)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

router.post('/website-data', async (req, res) => {
  try {
    const { title, content, category, url } = req.body
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' })
    }

    await connectToDatabase()
    const embedding = await generateEmbedding(`${title}\n${content}`)
    const data = await WebsiteData.create({ title, content, category, url, embedding })

    return res.status(201).json({
      data: {
        id: data._id.toString(),
        title: data.title,
        content: data.content,
        category: data.category,
        url: data.url,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    })
  } catch (error) {
    console.error('Create website data error:', error)
    return res.status(500).json({ error: 'Failed to create data' })
  }
})

router.put('/website-data/:id', async (req, res) => {
  try {
    const { title, content, category, url } = req.body
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' })
    }

    await connectToDatabase()
    const embedding = await generateEmbedding(`${title}\n${content}`)
    const data = await WebsiteData.findByIdAndUpdate(
      req.params.id,
      { title, content, category, url, embedding },
      { new: true }
    ).select('-embedding')

    if (!data) return res.status(404).json({ error: 'Not found' })

    return res.json({
      data: {
        id: data._id.toString(),
        title: data.title,
        content: data.content,
        category: data.category,
        url: data.url,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update website data error:', error)
    return res.status(500).json({ error: 'Failed to update data' })
  }
})

router.delete('/website-data/:id', async (req, res) => {
  try {
    await connectToDatabase()
    const result = await WebsiteData.findByIdAndDelete(req.params.id)
    if (!result) return res.status(404).json({ error: 'Not found' })
    return res.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete website data error:', error)
    return res.status(500).json({ error: 'Failed to delete data' })
  }
})

// FAQs
router.get('/faqs', async (req, res) => {
  try {
    await connectToDatabase()
    const faqs = await FAQ.find({}).select('-embedding').sort({ order: 1, updatedAt: -1 }).lean()
    return res.json({
      faqs: faqs.map((f) => ({
        id: f._id.toString(),
        question: f.question,
        answer: f.answer,
        category: f.category,
        order: f.order,
        isActive: f.isActive,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get FAQs error:', error)
    return res.status(500).json({ error: 'Failed to fetch FAQs' })
  }
})

router.post('/faqs', async (req, res) => {
  try {
    const { question, answer, category, order, isActive } = req.body
    if (!question || !answer || !category) {
      return res.status(400).json({ error: 'Question, answer, and category are required' })
    }

    await connectToDatabase()
    const embedding = await generateEmbedding(`Q: ${question}\nA: ${answer}`)
    const faq = await FAQ.create({
      question,
      answer,
      category,
      order: order || 0,
      isActive: isActive ?? true,
      embedding,
    })

    return res.status(201).json({
      faq: {
        id: faq._id.toString(),
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        order: faq.order,
        isActive: faq.isActive,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      },
    })
  } catch (error) {
    console.error('Create FAQ error:', error)
    return res.status(500).json({ error: 'Failed to create FAQ' })
  }
})

router.put('/faqs/:id', async (req, res) => {
  try {
    const { question, answer, category, order, isActive } = req.body
    if (!question || !answer || !category) {
      return res.status(400).json({ error: 'Question, answer, and category are required' })
    }

    await connectToDatabase()
    const embedding = await generateEmbedding(`Q: ${question}\nA: ${answer}`)
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category, order, isActive, embedding },
      { new: true }
    ).select('-embedding')

    if (!faq) return res.status(404).json({ error: 'Not found' })

    return res.json({
      faq: {
        id: faq._id.toString(),
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        order: faq.order,
        isActive: faq.isActive,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update FAQ error:', error)
    return res.status(500).json({ error: 'Failed to update FAQ' })
  }
})

router.delete('/faqs/:id', async (req, res) => {
  try {
    await connectToDatabase()
    const result = await FAQ.findByIdAndDelete(req.params.id)
    if (!result) return res.status(404).json({ error: 'Not found' })
    return res.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete FAQ error:', error)
    return res.status(500).json({ error: 'Failed to delete FAQ' })
  }
})

export default router
