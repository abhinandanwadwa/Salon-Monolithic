import mongoose from 'mongoose';

const whatsAppSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    creds: { type: Object, required: true },
    keys: { type: Object, required: true }
}, { timestamps: true });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
export default WhatsAppSession;
