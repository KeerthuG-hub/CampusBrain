/**
 * Google Drive Folder Test (ES Module Version)
 * 
 * Usage:
 *   node test-folders.mjs list
 *   node test-folders.mjs test "Semester 1/CS101 - Programming/Notes"
 *   node test-folders.mjs duplicates
 *   node test-folders.mjs quick
 */

import dotenv from 'dotenv'
import { google } from 'googleapis'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Setup OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const drive = google.drive({ version: 'v3', auth: oauth2Client })

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function listFoldersInParent(parentId, depth = 0) {
  const indent = '  '.repeat(depth)
  
  try {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    
    const { data } = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 100,
    })

    if (!data.files || data.files.length === 0) {
      console.log(`${indent}  (empty)`)
      return []
    }

    const folders = []
    for (const folder of data.files) {
      console.log(`${indent}📁 ${folder.name}`)
      console.log(`${indent}   ID: ${folder.id}`)
      folders.push({ name: folder.name, id: folder.id })
      
      if (depth < 2) {
        await listFoldersInParent(folder.id, depth + 1)
      }
    }
    
    return folders
  } catch (error) {
    console.error(`${indent}❌ Error: ${error.message}`)
    return []
  }
}

async function findFolder(folderName, parentId) {
  const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  
  const { data } = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 100,
  })

  if (!data.files || data.files.length === 0) {
    return null
  }

  // Case-insensitive exact match
  const match = data.files.find(
    f => f.name?.toLowerCase().trim() === folderName.toLowerCase().trim()
  )

  return match ? match.id : null
}

async function testPath(path, rootId) {
  console.log(`\n🧪 Testing Path: ${path}`)
  console.log('━'.repeat(60))
  
  const parts = path.split('/').filter(p => p.trim())
  let currentId = rootId
  let success = true
  
  for (let i = 0; i < parts.length; i++) {
    const folderName = parts[i].trim()
    console.log(`\n📁 Level ${i + 1}/${parts.length}: "${folderName}"`)
    console.log(`   Parent: ${currentId}`)
    
    const foundId = await findFolder(folderName, currentId)
    
    if (foundId) {
      console.log(`   ✅ FOUND: ${foundId}`)
      currentId = foundId
    } else {
      console.log(`   ❌ NOT FOUND - Will be created on upload`)
      success = false
      break
    }
  }
  
  console.log('\n' + '━'.repeat(60))
  if (success) {
    console.log(`✅ ALL FOLDERS EXIST - Will reuse: ${currentId}`)
  } else {
    console.log(`⚠️  Some folders missing - New folders will be created`)
  }
  
  return success
}

async function checkForDuplicates(rootId, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return
  
  const indent = '  '.repeat(depth)
  
  const query = `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const { data } = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1000,
  })

  if (!data.files || data.files.length === 0) return

  // Group by name (case-insensitive)
  const grouped = new Map()
  data.files.forEach(f => {
    const key = f.name.toLowerCase().trim()
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(f)
  })

  // Find duplicates
  let hasDuplicates = false
  for (const [name, folders] of grouped.entries()) {
    if (folders.length > 1) {
      if (!hasDuplicates) {
        console.log(`${indent}⚠️  DUPLICATES FOUND:`)
        hasDuplicates = true
      }
      console.log(`${indent}  📁 "${folders[0].name}" has ${folders.length} copies:`)
      folders.forEach((f, i) => {
        console.log(`${indent}     ${i + 1}. ${f.id}`)
      })
    }
  }

  // Recursively check subfolders
  for (const folder of data.files) {
    if (grouped.get(folder.name.toLowerCase().trim()).length === 1) {
      await checkForDuplicates(folder.id, depth + 1, maxDepth)
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

  if (!rootId) {
    console.error('❌ GOOGLE_DRIVE_ROOT_FOLDER_ID not set in .env.local')
    process.exit(1)
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('           GOOGLE DRIVE FOLDER STRUCTURE TEST')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`\n📂 Root Folder: ${rootId}\n`)

  const args = process.argv.slice(2)
  const command = args[0] || 'list'

  try {
    if (command === 'list') {
      console.log('📋 FOLDER STRUCTURE:\n')
      await listFoldersInParent(rootId)
      
    } else if (command === 'test' && args[1]) {
      await testPath(args[1], rootId)
      
    } else if (command === 'duplicates') {
      console.log('🔍 CHECKING FOR DUPLICATES:\n')
      await checkForDuplicates(rootId)
      console.log('\n✅ Duplicate check complete')
      
    } else if (command === 'quick') {
      // Quick test of common paths
      console.log('🚀 QUICK TEST - Common Upload Paths\n')
      
      const testPaths = [
        'Semester 1/CS101 - Introduction to Programming/Notes and PPTs',
        'Semester 1/CS101 - Introduction to Programming/Course Plan',
        'Semester 2/CS201 - Data Structures/Books',
      ]
      
      for (const path of testPaths) {
        await testPath(path, rootId)
        console.log('')
      }
      
    } else {
      console.log('Usage:')
      console.log('  node test-folders.mjs list                    - List all folders')
      console.log('  node test-folders.mjs test "Semester 1/..."   - Test specific path')
      console.log('  node test-folders.mjs duplicates              - Check for duplicates')
      console.log('  node test-folders.mjs quick                   - Quick test common paths')
    }

    console.log('\n✅ Done\n')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.code === 401) {
      console.error('\n⚠️  Authentication failed. Check your GOOGLE_REFRESH_TOKEN.')
    }
  }
}

main().catch(console.error)