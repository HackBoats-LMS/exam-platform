import mongoose from 'mongoose'

const QuestionSetSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
    },
    { timestamps: true }
)

const QuestionSet =
    mongoose.models.QuestionSet ||
    mongoose.model('QuestionSet', QuestionSetSchema)

export default QuestionSet
