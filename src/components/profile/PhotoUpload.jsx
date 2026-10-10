import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera } from 'lucide-react'
import { uploadImage } from '../../lib/cloudinary'
import Avatar from '../ui/Avatar'
import toast from 'react-hot-toast'

export default function PhotoUpload({ currentUrl, name, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState(null)
  const inputRef                  = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const url = await uploadImage(file, 'avatars')
      await onUpload(url)
      setPreview(null)
      toast.success('Photo updated!')
    } catch (err) {
      toast.error('Could not update photo: ' + err.message)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = preview || currentUrl

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar src={displayUrl} name={name} size="2xl" />
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-neo-secondary border-4 border-black shadow-neo-sm flex items-center justify-center hover:bg-neo-accent hover:text-white transition-colors duration-100 disabled:opacity-50"
          aria-label="Upload photo"
        >
          {uploading
            ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            : <Camera className="h-4 w-4" strokeWidth={3} />
          }
        </motion.button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const input = e.currentTarget
          const file = input.files?.[0]
          input.value = ''
          void handleFile(file)
        }}
      />

      <p className="font-bold text-xs text-black/50 uppercase tracking-wide text-center">
        Max 300 KB · JPEG / PNG / WebP
      </p>
    </div>
  )
}
