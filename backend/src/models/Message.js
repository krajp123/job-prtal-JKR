const mongoose = require('mongoose');

// Chat/messaging flow (Section 5.6): only a recruiter can start a conversation.
const messageSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },

    startedByRecruiter: { type: Boolean, default: true },
    conversationOpenUntil: { type: Date }, // stays open 7 days after candidate's first reply

    sender: { type: String, enum: ['recruiter', 'candidate'], required: true },
    text: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
