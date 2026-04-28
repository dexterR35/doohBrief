import { useState } from 'react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { uploadDoohBriefFile } from '../doohUpload'
import { toast } from '../../../lib/toast'

function pickOne(val) {
  if (val == null) return null
  if (val instanceof FileList && val.length > 0) return val[0]
  if (val instanceof File) return val
  return null
}

export default function DoohBrandUploads({ briefSlug, sceneId, media, refresh }) {
  const [busy, setBusy] = useState(false)
  const [videoFile, setVideoFile] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    const vid = pickOne(videoFile)
    if (!vid) {
      toast.info('Select a video file to upload.')
      return
    }
    setBusy(true)
    try {
      await uploadDoohBriefFile(vid, { briefSlug, sceneId, kind: 'final_video' })
      toast.success('Upload saved')
      await refresh()
      setVideoFile(null)
    } catch (err) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card padding="md" className="dooh-upload-strip mt-6">
      <CardHeader title="Brand outro · uploads" subtitle="Final video — Supabase Storage + PostgreSQL." />
      <div className="mb-6 space-y-4 border-b border-border-subtle pb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-tertiary">Current upload</p>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-secondary">Final video</p>
          {media.finalVideo ? (
            <video src={media.finalVideo} controls className="max-h-[240px] w-full max-w-2xl rounded-lg border border-border" />
          ) : (
            <p className="text-sm text-ink-tertiary">No uploaded video yet.</p>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input type="file" accept="video/*" label="Final video" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
        <Button type="submit" variant="primary" size="md" loading={busy} disabled={busy || !videoFile}>
          {busy ? 'Uploading…' : 'Upload video'}
        </Button>
      </form>
    </Card>
  )
}
