const fs = require('fs')
const env = fs.readFileSync('.env.local', 'utf8')
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) process.env[match[1]] = match[2]
})

const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function isScanReadyForAI(scanId, userId) {
  const { data: scan } = await admin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!scan || !(scan.status === 'scanning' || scan.status === 'failed')) {
    console.log('failed at check 1', scan)
    return false
  }

  const { count, error } = await admin
    .from('scan_files')
    .select('*', { count: 'exact', head: true })
    .eq('scan_id', scanId)

  if (error || count === null || count === 0) {
    console.log('failed at check 2', { error, count })
    return false
  }

  return true
}

async function test() {
  const scanId = 'cab84cb3-e004-4313-a3c2-15944c6872c8'
  const userId = 'c5bb0259-1cf0-4026-a8f3-f3f69002249c' 
  
  const ready = await isScanReadyForAI(scanId, userId)
  console.log('isScanReadyForAI:', ready)
}

test()
