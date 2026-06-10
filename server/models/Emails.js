import mongoose from "mongoose"

const emailLogSchema = new mongoose.Schema({
  firstName:   { type: String },
  lastName:    { type: String },
  email:       { type: String, required: true },
  company:     { type: String },
  role:        { type: String },

  subject:     { type: String },
  body:        { type: String },

  status:      { type: String, enum: ['queued', 'sent', 'failed', 'replied'], default: 'queued' },
  error:       { type: String },  

  queuedAt:    { type: Date, default: Date.now },
  sentAt:      { type: Date },

  campaignId:  { type: String },
})

module.exports = mongoose.model('Email', emailLogSchema)