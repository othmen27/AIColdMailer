import nodemailer from 'nodemailer'
import Email from '../models/Emails.js'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})
function randomDelay(minMs = 3 * 60 * 1000, maxMs = 7 * 60 * 1000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  const mins = (ms / 60000).toFixed(1)
  console.log(`⏱  Waiting ${mins} minutes before next send...`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendEmail(logEntry, subject, body) {
  try {
    await transporter.sendMail({
      from: `"Othmen Mhiri" <${process.env.GMAIL_USER}>`,
      to: logEntry.email,
      subject,
      html: body.replace(/\n/g, '<br>'), 
      text: body,
    })
 
    logEntry.status = 'sent'
    logEntry.sentAt = new Date()
    logEntry.subject = subject
    logEntry.body = body
    await logEntry.save()
 
    console.log(`✅ Sent to ${logEntry.email} (${logEntry.company})`)
    return true
 
  } catch (err) {
    logEntry.status = 'failed'
    logEntry.error = err.message
    await logEntry.save()
    console.error(`❌ Failed for ${logEntry.email}: ${err.message}`)
    return false
  }
}

async function runCampaign(contacts, baseTemplate, resumeSummary, campaignId, options = {}) {
  const {
    minDelay   = 2 * 60 * 1000, 
    maxDelay   = 5 * 60 * 1000,
    dailyLimit = 40, 
  } = options
 
  const { personalizeEmail } = require('./groqPersonalizer')
 
  const batch = contacts.slice(0, dailyLimit)
  const results = { sent: 0, failed: 0, total: batch.length }
 
  console.log(`Starting campaign: ${batch.length} emails queued`)
 
  for (let i = 0; i < batch.length; i++) {
    const contact = batch[i]
    console.log(`\n[${i + 1}/${batch.length}] Processing ${contact.firstName} at ${contact.company}`)
 
    const logEntry = await EmailLog.create({
      ...contact,
      status: 'queued',
      campaignId,
    })
    try {
      console.log(`Personalizing with AI...`)
      const { subject, body } = await personalizeEmail(contact, baseTemplate, resumeSummary)
 
      const success = await sendEmail(logEntry, subject, body)
      if (success) results.sent++
      else results.failed++
 
    } catch (err) {
      logEntry.status = 'failed'
      logEntry.error = err.message
      await logEntry.save()
      results.failed++
      console.error(`  Error: ${err.message}`)
    }
 
    if (i < batch.length - 1) {
      await randomDelay(minDelay, maxDelay)
    }
  }
   console.log(`\n Campaign complete: ${results.sent} sent, ${results.failed} failed`)
  return results
}
module.exports = { runCampaign, sendEmail }