import mongoose from 'mongoose'

const ExamConfigSchema = new mongoose.Schema({
    timeLimit: { type: Number, default: 30 }, // minutes
    numQuestions: { type: Number, default: 10 },
    updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.ExamConfig || mongoose.model('ExamConfig', ExamConfigSchema)
