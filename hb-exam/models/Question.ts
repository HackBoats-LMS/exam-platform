import mongoose, { Schema, Document } from 'mongoose'

export interface IQuestion extends Document {
    questionText: string
    options: string[]
    correctOption: number
    setName: string
    sectionName: string
    createdAt?: Date
    updatedAt?: Date
}

const QuestionSchema = new Schema<IQuestion>(
    {
        questionText: { type: String, required: true },
        options: [{ type: String }],
        correctOption: { type: Number, required: true, default: 0 },
        setName: { type: String, default: 'Default Set' },
        sectionName: { type: String, default: 'General' },
    },
    {
        timestamps: true, // auto creates createdAt + updatedAt
    }
)

// 🔥 Index for fetchQuestions: Question.find({ setName }).sort({ sectionName, createdAt })
// Compound index covers both the filter AND the sort in one pass.
QuestionSchema.index({ setName: 1, sectionName: 1, createdAt: 1 })
QuestionSchema.index({ setName: 1 }) // for countDocuments({ setName })

// Use cached model or create fresh one
const Question = (mongoose.models.Question as mongoose.Model<IQuestion>) || mongoose.model<IQuestion>('Question', QuestionSchema)

export default Question
