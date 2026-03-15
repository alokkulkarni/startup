'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Project } from '@forge/shared'

interface DeleteProjectModalProps {
  project: Project
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

export function DeleteProjectModal({ project, onClose, onConfirm }: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const matches = confirmName === project.name

  const handleDelete = async () => {
    if (!matches) return
    setLoading(true)
    await onConfirm(project.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold text-red-400">Delete project?</h2>
          <p className="text-sm text-gray-400 mt-1">
            This will delete <span className="font-medium text-white">"{project.name}"</span> and all its files.
            You can recover it within 30 days.
          </p>
        </div>

        <Input
          id="confirm-name"
          label={`Type "${project.name}" to confirm`}
          placeholder={project.name}
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          autoFocus
        />

        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!matches}
            loading={loading}
            className="flex-1"
          >
            Delete project
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
