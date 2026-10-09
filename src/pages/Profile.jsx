import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import PhotoUpload from '../components/profile/PhotoUpload'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import { Save, Link as LinkIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { DHAKA_TIME_ZONE } from '../lib/dhakaTime'

export default function Profile() {
  const { userDoc, firebaseUser } = useAuth()
  const [form, setForm]   = useState({ name: '', bio: '', timezone: DHAKA_TIME_ZONE })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userDoc) {
      setForm({ name: userDoc.name || '', bio: userDoc.bio || '', timezone: DHAKA_TIME_ZONE })
    }
  }, [userDoc])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        name: form.name.trim(),
        bio: form.bio.trim(),
        timezone: form.timezone,
        updatedAt: serverTimestamp(),
      })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (url) => {
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      photoURL: url,
      updatedAt: serverTimestamp(),
    })
  }

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="font-black text-4xl uppercase tracking-tight mb-8">
            My <span className="bg-neo-secondary px-2 border-4 border-black">Profile</span>
          </h1>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Photo */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Profile Photo</h2>
              <PhotoUpload
                currentUrl={userDoc?.photoURL}
                name={userDoc?.name || 'U'}
                onUpload={handlePhotoUpload}
              />
            </div>

            {/* Basic info */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Basic Info</h2>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                />
                <Textarea
                  label="Bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell others about yourself…"
                  rows={3}
                />
                <div>
                  <label className="label">Site Timezone</label>
                  <p className="font-bold text-sm">Bangladesh time ({DHAKA_TIME_ZONE}, UTC+6)</p>
                </div>
              </div>
            </div>

            {/* Account info (read-only) */}
            <div className="card p-6 shadow-neo-md bg-neo-bg">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Account</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Email</span>
                  <span className="font-bold text-sm">{firebaseUser?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Verified</span>
                  <span className={`badge ${firebaseUser?.emailVerified ? 'badge-green' : 'badge-accent'}`}>
                    {firebaseUser?.emailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Account Status</span>
                  <span className="badge badge-green">{userDoc?.status || 'active'}</span>
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" full loading={loading} className="btn-lg">
              <Save className="h-4 w-4" strokeWidth={3} /> Save Changes
            </Button>
          </form>
        </motion.div>
      </div>
    </PageLayout>
  )
}
