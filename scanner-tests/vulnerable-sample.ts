// @ts-nocheck
// scanner-tests/vulnerable-sample.ts
// This file contains intentionally vulnerable code to test the VibeSafe AI scanner.
// Do NOT use this code in production.

import express from 'express'
import jwt from 'jsonwebtoken'
import { Pool } from 'pg'
import fs from 'fs'

const app = express()
const pool = new Pool()

// VULN 1: Hardcoded API Key (Secrets)
const STRIPE_SECRET_KEY = "sk_test_fake_secret_for_testing_123"

// VULN 2: Weak JWT Secret (Secrets)
const JWT_SECRET = "secret123"

app.post('/api/login', (req, res) => {
  const { username } = req.body
  // VULN 3: Token with no expiration and weak secret (Auth)
  const token = jwt.sign({ username }, JWT_SECRET)
  res.json({ token })
})

app.get('/api/users', async (req, res) => {
  const { id } = req.query
  // VULN 4: SQL Injection (Database)
  const query = `SELECT * FROM users WHERE id = ${id}`
  const result = await pool.query(query)
  res.json(result.rows)
})

app.post('/api/upload', (req, res) => {
  // VULN 5: Path Traversal & Unsafe file writing (File Upload)
  const filename = req.query.filename as string
  const content = req.body.content
  
  // Unsafe writing to absolute path controlled by user
  fs.writeFileSync(`/var/www/uploads/${filename}`, content)
  res.json({ success: true })
})

app.post('/webhook/paddle', (req, res) => {
  // VULN 6: Missing webhook signature verification (Payments/Webhooks)
  const payload = req.body
  
  if (payload.alert_name === 'subscription_created') {
    console.log("Subscription created for user!", payload.user_id)
  }
  
  res.send('OK')
})

app.listen(3000, () => {
  console.log('Server running')
})
