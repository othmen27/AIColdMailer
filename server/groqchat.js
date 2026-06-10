import { Groq } from "groq-sdk/client.js";
const groq = new Groq({apiKey : process.env.GROQ_KEY})

async function email(contact, basetemplate, resumeSummary) {
    const {firstName, lastName, company, role, industry, website} = contact
      const prompt = `
        You are helping a job seeker send a cold email to a potential employer.
        CANDIDATE INFO (Othmen Mhiri):
        ${resumeSummary}
        RECIPIENT:
            - Name: ${firstName} ${lastName}
            - Role: ${role}
            - Company: ${company}
            - Industry: ${industry || 'tech'}
            - Website: ${website || 'N/A'}
        BASE EMAIL TEMPLATE (rewrite this, keep the core message):
        ${baseTemplate}
        INSTRUCTIONS:
            - Rewrite the email to feel personal and specific to ${company}
            - Replace any [placeholders] naturally
            - Keep it under 150 words — shorter is better for cold email
            - Confident, direct tone — no fluff like "I hope this email finds you well"
            - First sentence must reference something specific about ${company} or ${role}
            - End with ONE clear question (not "are you hiring?" — something more specific)
            - Do NOT use fake details you don't know — keep it honest
            - Return ONLY valid JSON, nothing else:
                {
                    "subject": "the subject line here",
                    "body": "the email body here"
                }
  `
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{role: 'user', content : prompt}],
    response_format: {type: 'json_object'},
    temperature: 0.7,
  })
  const result = JSON.parse(response.choices[0].message.content)
  const body = result.body.replace(/\[First Name\]/gi, firstName)
                          .replace(/\[Company\]/gi, company)
    return {
        subject: result.subject,
        body,
    }                       
}

module.exports = {email}
