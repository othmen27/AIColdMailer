import express from "express"
import { v4 as uuidv4 } from 'uuid';
import {parseCSV} from '../helpers/csvParser.js'
import {email} from '../helpers/groqChat.js'
import {runCampaign} from '../helpers/emailSender.js'
import {Email as EmailLog} from "../models/Emails.js"
const router = express.Router()
const activeCampaigns = new Map()

router.post('/preview', async (req, res) => {
  try {
    const { contact, baseTemplate, resumeSummary } = req.body
 
    if (!contact || !baseTemplate || !resumeSummary) {
      return res.status(400).json({ error: 'contact, baseTemplate, and resumeSummary are required' })
    }
 
    const { subject, body } = await email(contact, baseTemplate, resumeSummary)
    res.json({ subject, body, contact })
 
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/launch', async (req, res) => {
  try {
    const {
      csvPath,          
      baseTemplate,  
      resumeSummary, 
      minDelay, 
      maxDelay,
      dailyLimit,
    } = req.body
 
    if (!csvPath || !baseTemplate || !resumeSummary) {
      return res.status(400).json({ error: 'csvPath, baseTemplate, resumeSummary required' })
    }
 
    const contacts = parseCSV(csvPath)
    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in CSV' })
    }
 
    const campaignId = uuidv4()
    activeCampaigns.set(campaignId, { status: 'running', startedAt: new Date() })
 
    runCampaign(contacts, baseTemplate, resumeSummary, campaignId, {
      minDelay:   minDelay   || 2 * 60 * 1000,
      maxDelay:   maxDelay   || 5 * 60 * 1000,
      dailyLimit: dailyLimit || 40,
    }).then(results => {
      activeCampaigns.set(campaignId, { status: 'complete', ...results })
      console.log(`Campaign ${campaignId} complete:`, results)
    }).catch(err => {
      activeCampaigns.set(campaignId, { status: 'error', error: err.message })
    })
 
    res.json({
      message: `Campaign launched with ${Math.min(contacts.length, dailyLimit || 40)} emails`,
      campaignId,
      totalContacts: contacts.length,
    })
 
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/status/:campaignId', (req, res) => {
  const campaign = activeCampaigns.get(req.params.campaignId)
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
  res.json(campaign)
})

router.get('/logs', async (req, res) => {
  try {
    const { campaignId, status, limit = 100 } = req.query
    const filter = {}
    if (campaignId) filter.campaignId = campaignId
    if (status) filter.status = status
 
    const logs = await EmailLog.find(filter)
      .sort({ queuedAt: -1 })
      .limit(Number(limit))
 
    const stats = {
      total:   await EmailLog.countDocuments(filter),
      sent:    await EmailLog.countDocuments({ ...filter, status: 'sent' }),
      failed:  await EmailLog.countDocuments({ ...filter, status: 'failed' }),
      queued:  await EmailLog.countDocuments({ ...filter, status: 'queued' }),
    }
 
    res.json({ logs, stats })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})