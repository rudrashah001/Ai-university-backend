import mongoose from 'mongoose'

const FAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, required: true, trim: true, index: true },
    embedding: { type: [Number], select: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

FAQSchema.index({ question: 'text', answer: 'text' })

export const FAQ = mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema)
