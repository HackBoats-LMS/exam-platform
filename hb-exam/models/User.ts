import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    supabaseId: { type: String, unique: true, sparse: true }, // Legacy Supabase ID
    googleId: { type: String, unique: true, sparse: true }, // NextAuth Google ID
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Used for admin credentials
    fullName: { type: String },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    college: String,
    department: String,
    section: String,
    rollNo: String,
    year: String,
    mobile: String,
    whatsapp: String,
    createdAt: { type: Date, default: Date.now },
})

// Prevent overwrite error in hot reload
export default mongoose.models.User || mongoose.model('User', UserSchema)
