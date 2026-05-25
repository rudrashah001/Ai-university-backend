import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const ChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
)

ChatSchema.index({ userId: 1, updatedAt: -1 })

export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema)
