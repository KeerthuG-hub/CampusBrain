/**
 * Debug script to visualize Google Drive folder structure
 * Run with: npx ts-node scripts/debug-folders.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const drive = google.drive({ version: 'v3', auth: oauth2Client })

/**
 * List all folders in a parent folder
 */
async function listFolders(parentId: string, depth: number = 0): Promise<void> {
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
      console.log(`${indent}(no folders)`)
      return
    }

    for (const folder of data.files) {
      console.log(`${indent}📁 ${folder.name} (${folder.id})`)
      
      // Recursively list subfolders (max depth 3 to avoid too much output)
      if (depth < 3) {
        await listFolders(folder.id!, depth + 1)
      }
    }
  } catch (error: any) {
    console.error(`${indent}❌ Error: ${error.message}`)
  }
}

/**
 * Search for a specific folder by name
 */
async function findFolder(folderName: string, parentId: string): Promise<void> {
  console.log(`\n🔍 Searching for "${folderName}" in parent ${parentId}...\n`)
  
  try {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    
    const { data } = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 100,
    })

    if (!data.files || data.files.length === 0) {
      console.log(`❌ No folders found in parent`)
      return
    }

    console.log(`Found ${data.files.length} folders:`)
    data.files.forEach((f, i) => {
      const match = f.name?.toLowerCase() === folderName.toLowerCase() ? ' ✅ MATCH' : ''
      console.log(`  ${i + 1}. "${f.name}" (${f.id})${match}`)
    })

    const exactMatch = data.files.find(
      f => f.name?.toLowerCase().trim() === folderName.toLowerCase().trim()
    )

    if (exactMatch) {
      console.log(`\n✅ Found exact match: ${exactMatch.id}`)
    } else {
      console.log(`\n❌ No exact match found`)
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
  }
}

/**
 * Test folder navigation
 */
async function testNavigation(folderPath: string): Promise<void> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
  console.log(`\n🧪 Testing navigation: ${folderPath}`)
  console.log(`   Root ID: ${rootId}\n`)

  const parts = folderPath.split('/').filter(p => p.trim())
  let currentId = rootId

  for (let i = 0; i < parts.length; i++) {
    const folderName = parts[i].trim()
    console.log(`📁 Level ${i + 1}: "${folderName}"`)
    console.log(`   Parent: ${currentId}`)
    
    await findFolder(folderName, currentId)
    
    // For actual navigation, you'd update currentId here
    console.log('')
  }
}

/**
 * Main function
 */
async function main() {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

  if (!rootId) {
    console.error('❌ GOOGLE_DRIVE_ROOT_FOLDER_ID not set in .env.local')
    process.exit(1)
  }

  console.log('═══════════════════════════════════════════════════')
  console.log('     GOOGLE DRIVE FOLDER STRUCTURE DEBUGGER')
  console.log('═══════════════════════════════════════════════════')
  console.log(`\nRoot Folder ID: ${rootId}\n`)

  const args = process.argv.slice(2)

  if (args[0] === 'list') {
    console.log('📋 LISTING ALL FOLDERS:\n')
    await listFolders(rootId)
  } else if (args[0] === 'test' && args[1]) {
    // Test specific path
    // Example: npm run debug-folders test "Semester 1/CS101 - Programming/Notes and PPTs"
    await testNavigation(args[1])
  } else if (args[0] === 'find' && args[1] && args[2]) {
    // Find folder by name in parent
    // Example: npm run debug-folders find "Semester 1" <parent-id>
    await findFolder(args[1], args[2])
  } else {
    console.log('Usage:')
    console.log('  npm run debug-folders list')
    console.log('  npm run debug-folders test "Semester 1/CS101 - Programming/Notes"')
    console.log('  npm run debug-folders find "Semester 1" <parent-id>')
    console.log('\nOr run directly:')
    console.log('  npx ts-node scripts/debug-folders.ts list')
  }

  console.log('\n✅ Done\n')
}

main().catch(console.error)