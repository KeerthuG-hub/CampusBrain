import { google } from 'googleapis'
import { Readable } from 'stream'

// ============================================================================
// OAUTH CONFIGURATION
// ============================================================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

oauth2Client.on('tokens', (tokens) => {
  console.log('🔄 Access token auto-refreshed at:', new Date().toISOString())
  if (tokens.refresh_token) {
    console.warn('⚠️  New refresh token issued. Update GOOGLE_REFRESH_TOKEN in .env.local!')
  }
})

const drive = google.drive({ version: 'v3', auth: oauth2Client })

// ============================================================================
// CONFIGURATION
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  'course_plan': 'Course Plan',
  'notes': 'Notes and PPTs',
  'ppt': 'Notes and PPTs',
  'book': 'Books',
  'question_paper': 'Question Papers'
}

// In-memory cache to prevent duplicate folder creation
const folderCache = new Map<string, { id: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limiting map
const uploadAttempts = new Map<string, { count: number; resetAt: number }>()

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const userLimit = uploadAttempts.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    uploadAttempts.set(userId, { count: 1, resetAt: now + 3600000 })
    return { allowed: true, remaining: 9 }
  }

  if (userLimit.count >= 10) {
    return { allowed: false, remaining: 0 }
  }

  userLimit.count++
  return { allowed: true, remaining: 10 - userLimit.count }
}

export function validateFileType(fileName: string, mimeType: string): boolean {
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain',
  ]

  if (!ALLOWED_TYPES.includes(mimeType)) return false

  const dangerousPatterns = ['../', '.env', 'passwd', 'shadow', '<script']
  if (dangerousPatterns.some(p => fileName.toLowerCase().includes(p))) return false

  return true
}

// ============================================================================
// FOLDER FUNCTIONS
// ============================================================================

async function findExistingFolder(
  folderName: string,
  parentId: string
): Promise<string | null> {
  try {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

    const { data } = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 200,
    })

    if (!data.files || data.files.length === 0) return null

    const exact = data.files.find(f => f.name?.trim().toUpperCase() === folderName.trim().toUpperCase())

    if (exact) {
      console.log(`✅ Found folder: ${exact.name} (${exact.id})`)
      return exact.id
    }

    return null
  } catch (error: any) {
    console.error('❌ Error during folder search:', error.message)
    return null
  }
}

async function getOrCreateFolder(
  folderName: string,
  parentId: string
): Promise<string> {
  const cacheKey = `${parentId}::${folderName.toUpperCase().trim()}`

  const cached = folderCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.id

  const existingId = await findExistingFolder(folderName, parentId)
  if (existingId) {
    folderCache.set(cacheKey, { id: existingId, timestamp: Date.now() })
    return existingId
  }

  console.log(`📁 Creating folder "${folderName}" under parent ${parentId}`)
  try {
    const { data: folder } = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id, name',
    })

    if (!folder.id) throw new Error('No folder ID returned')

    await drive.permissions.create({
      fileId: folder.id,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    folderCache.set(cacheKey, { id: folder.id, timestamp: Date.now() })
    console.log(`✅ Created folder: ${folder.name} (${folder.id})`)
    return folder.id
  } catch (error: any) {
    console.error('❌ Error creating folder:', error.message)
    console.error('❌ Full error:', JSON.stringify(error, null, 2))
    
    if (error.code === 409) {
      const retryId = await findExistingFolder(folderName, parentId)
      if (retryId) return retryId
    }
    
    // ✅ FIXED: Proper Error syntax with parentheses
    throw new Error(`Failed to get/create folder "${folderName}": ${error.message}`)
  }
}

export function generateFolderPath(
  semesterNumber: number,
  courseCode: string,
  courseName: string,
  resourceType: string
): string {
  const categoryName = CATEGORY_MAP[resourceType] || 'Miscellaneous'

  const courseFolder = `${courseCode}-${courseName}`.toUpperCase()
  const semesterFolder = `Semester ${semesterNumber}`

  return `${semesterFolder}/${courseFolder}/${categoryName}`
}

async function createFolderStructure(folderPath: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID is not set in environment variables')
  }

  console.log(`📂 Creating folder structure: ${folderPath}`)
  console.log(`📂 Root folder ID: ${rootFolderId}`)

  let currentParentId = rootFolderId
  const parts = folderPath.split('/').filter(p => p.trim())

  console.log(`📂 Folder parts: ${JSON.stringify(parts)}`)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    console.log(`📁 Processing folder ${i + 1}/${parts.length}: "${part}"`)
    currentParentId = await getOrCreateFolder(part, currentParentId)
    console.log(`✅ Folder "${part}" ID: ${currentParentId}`)
  }

  return currentParentId
}

// ============================================================================
// UPLOAD & UTILITY FUNCTIONS
// ============================================================================

export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string
): Promise<{ fileId: string; webViewLink: string; webContentLink: string; folderId: string }> {
  console.log(`🚀 Starting upload: ${fileName}`)
  console.log(`📂 Target folder path: ${folderPath}`)

  if (!validateFileType(fileName, mimeType)) {
    throw new Error('Invalid file type')
  }

  const folderId = await createFolderStructure(folderPath)
  console.log(`✅ Final folder ID: ${folderId}`)

  const stream = Readable.from(buffer)

  console.log(`⬆️  Uploading file to Google Drive...`)

  const { data: file } = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink, webContentLink',
  })

  if (!file.id) throw new Error('Upload failed - no file ID returned')

  console.log(`🔐 Setting file permissions...`)

  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  console.log(`✅ Upload complete: ${file.id}`)

  return {
    fileId: file.id,
    webViewLink: file.webViewLink!,
    webContentLink: file.webContentLink || file.webViewLink!,
    folderId,
  }
}

export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  await drive.files.delete({ fileId })
}

export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

export function getFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}

export function generateSlug(title: string, resourceId: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
  return `${slug}-${resourceId.slice(0, 8)}`
}

export function clearFolderCache(): void {
  folderCache.clear()
  console.log('🧹 Folder cache cleared')
}