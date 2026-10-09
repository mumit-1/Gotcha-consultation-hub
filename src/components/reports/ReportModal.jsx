import { useState } from 'react'
import { motion } from 'framer-motion'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  'Spam',
  'Harassment',
  'Fraud',
  'Inappropriate behavior',
  'Fake consultant',
  'Other',
]

export default function ReportModal({ open, onClose, targetId, targetName }) {
  const { firebaseUser } = useAuth()
  const [type, setType]         = useState(REPORT_TYPES[0])
  const [description, setDesc]  = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) { toast.error('Please describe the issue'); return }
    setLoading(true)
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: firebaseUser.uid,
        targetId,
        type,
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      toast.success('Report submitted. We will review it.')
      setDesc('')
      onClose()
    } catch {
      toast.error('Could not submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Report ${targetName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Reason"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          {REPORT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>

        <Textarea
          label="Details"
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe what happened…"
          rows={4}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} full>Cancel</Button>
          <Button type="submit" variant="danger" loading={loading} full>Submit Report</Button>
        </div>
      </form>
    </Modal>
  )
}
