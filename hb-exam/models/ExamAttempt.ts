import mongoose from 'mongoose'

const ExamAttemptSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // MongoDB User ID

    status: { type: String, enum: ['started', 'completed', 'terminated'], default: 'started' },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    assignedSet: { type: String }, // Track which set was assigned
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
})

// 🔥 Critical indexes for high-concurrency exam platform
// Without these, every student page load causes a full collection scan.
ExamAttemptSchema.index({ userId: 1, startedAt: -1 })  // used in findOne({ userId }).sort({ startedAt: -1 })
ExamAttemptSchema.index({ userId: 1, status: 1 })       // used in status checks

export default mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', ExamAttemptSchema)
