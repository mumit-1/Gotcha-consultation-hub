import imageCompression from 'browser-image-compression'

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Compress + resize an image file, then upload to Cloudinary using an
 * unsigned upload preset (no server, no Storage, free tier safe).
 *
 * @param {File}   file        - The raw file from <input type="file">
 * @param {string} folder      - Cloudinary folder (e.g. "avatars")
 * @returns {Promise<string>}  - The secure_url of the uploaded image
 */
export async function uploadImage(file, folder = 'avatars') {
  // 1. Compress + resize client-side (max 800×800, 300 KB)
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  })

  // 2. Upload to Cloudinary
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Image upload failed')
  }

  const data = await res.json()
  return data.secure_url
}
