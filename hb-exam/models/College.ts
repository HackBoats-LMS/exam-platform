import mongoose from 'mongoose'

const CollegeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
})

export default mongoose.models.College || mongoose.model('College', CollegeSchema)
