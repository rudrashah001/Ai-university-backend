import mongoose from 'mongoose'

const WebsiteDataSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, required: true, trim: true, index: true },
    url: { type: String, trim: true },
    embedding: { type: [Number], select: false },
  },
  { timestamps: true }
)

WebsiteDataSchema.index({ title: 'text', content: 'text' })

export const WebsiteData =
  mongoose.models.WebsiteData || mongoose.model('WebsiteData', WebsiteDataSchema)
