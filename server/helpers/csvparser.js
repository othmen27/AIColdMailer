import parse from "csv-parse/sync"
import fs from 'fs'


function parseCSV(filepath){
    const raw = fs.readFileSync(filepath, 'utf8')


    const records = parse(raw,{
        columns: true,
        skip_empty_lines: true,
        trim: true,
    })
    const contacts = []
    for (const row of records){
        const email = row['Email'] || row['email'] || ''
        if (!email || !email.includes('@')) continue 
        contacts.push({
            firstName: row['First Name'] || row['first_name'] || '',
            lastName:  row['Last Name']  || row['last_name']  || '',
            email:     email.trim().toLowerCase(),
            role:      row['Title']      || row['title']      || '',
            company:   row['Company']    || row['Company Name for Emails'] || '',
            website:   row['Website']    || '',
            industry:  row['Industry']   || '',
            employees: row['# Employees'] || '',
        })
    }
    const seen = new Set()
    return contacts.filter(c => {
        if (seen.has(c.email)) return false
        seen.add(c.email)
        return true
    })
}
 
module.exports = { parseCSV }