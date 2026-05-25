import { GoogleGenerativeAI } from '@google/generative-ai'
import { embed } from 'ai'
import { google } from '@ai-sdk/google'
import { connectToDatabase } from './db.js'
import { WebsiteData } from './models/WebsiteData.js'
import { FAQ } from './models/FAQ.js'
import { WEBSITE_ENTRIES, FAQ_ENTRIES } from '../data/sit-knowledge.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function keywordScore(query, text) {
  const queryTokens = tokenize(query)
  const textLower = text.toLowerCase()
  let score = 0
  for (const token of queryTokens) {
    if (textLower.includes(token)) score += 1
  }
  return score
}

function retrieveFromStaticKnowledge(query, topK) {
  const results = []

  for (const entry of WEBSITE_ENTRIES) {
    const text = `${entry.title} ${entry.content} ${entry.category}`
    const score = keywordScore(query, text)
    if (score > 0) {
      results.push({
        content: entry.content,
        title: entry.title,
        category: entry.category,
        similarity: score,
        source: 'website',
      })
    }
  }

  for (const faq of FAQ_ENTRIES) {
    const text = `${faq.question} ${faq.answer} ${faq.category}`
    const score = keywordScore(query, text)
    if (score > 0) {
      results.push({
        content: `Q: ${faq.question}\nA: ${faq.answer}`,
        title: faq.question,
        category: faq.category,
        similarity: score,
        source: 'faq',
      })
    }
  }

  results.sort((a, b) => b.similarity - a.similarity)
  return results.slice(0, topK)
}

export async function generateEmbedding(text) {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('gemini-embedding-2'),
    value: text,
  });
  return embedding;
}

function cosineSimilarity(a, b) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function retrieveContext(query, topK = 5) {
  if (!query?.trim()) {
    return retrieveFromStaticKnowledge('courses contact apply', topK)
  }

  let dbResults = []

  if (process.env.GEMINI_API_KEY) {
    try {
      await connectToDatabase()
      const queryEmbedding = await generateEmbedding(query)

      const [websiteData, faqs] = await Promise.all([
        WebsiteData.find({}).select('+embedding').lean(),
        FAQ.find({ isActive: true }).select('+embedding').lean(),
      ])

      for (const doc of websiteData) {
        if (doc.embedding?.length > 0) {
          dbResults.push({
            content: doc.content,
            title: doc.title,
            category: doc.category,
            similarity: cosineSimilarity(queryEmbedding, doc.embedding),
            source: 'website',
          })
        }
      }

      for (const faq of faqs) {
        if (faq.embedding?.length > 0) {
          dbResults.push({
            content: `Q: ${faq.question}\nA: ${faq.answer}`,
            title: faq.question,
            category: faq.category,
            similarity: cosineSimilarity(queryEmbedding, faq.embedding),
            source: 'faq',
          })
        }
      }

      dbResults.sort((a, b) => b.similarity - a.similarity)
      dbResults = dbResults.slice(0, topK)
    } catch (error) {
      console.error('RAG embedding search error:', error.message)
    }
  }

  if (dbResults.length >= topK) {
    return dbResults
  }

  const staticResults = retrieveFromStaticKnowledge(query, topK)
  const merged = [...dbResults]

  for (const item of staticResults) {
    if (!merged.some((m) => m.title === item.title)) {
      merged.push(item)
    }
  }

  merged.sort((a, b) => b.similarity - a.similarity)
  return merged.slice(0, topK)
}

export { buildContextPrompt } from './sit-prompt.js'
