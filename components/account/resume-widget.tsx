'use client'

import { useRef, useState } from 'react'
import { CloudOff, Download, FileText, Loader2, Share2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ResumeToggle } from '@/components/resume/resume-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  deleteResume,
  downloadResume,
  formatSize,
  formatUploaded,
  shareResume,
  uploadResume,
  type ResumeDoc,
} from '@/lib/resume-actions'
import { useResumes } from '@/lib/use-resumes'

export function ResumeWidget() {
  const { documents, userId, mutate, isLoading } = useResumes()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function onFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const result = await uploadResume(file, userId)
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Saved to your account and this device')
    mutate()
  }

  async function run(doc: ResumeDoc, action: 'share' | 'download') {
    if (!userId) return
    setBusyId(doc.id)
    try {
      if (action === 'download') {
        await downloadResume(doc, userId)
      } else {
        const outcome = await shareResume(doc, userId)
        if (outcome === 'downloaded') toast.success('Sharing is not supported here, so the PDF was downloaded')
      }
    } catch {
      toast.error('Could not open this document. Connect to the internet and try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(doc: ResumeDoc) {
    setBusyId(doc.id)
    const ok = await deleteResume(doc.id)
    setBusyId(null)
    if (!ok) {
      toast.error('Could not delete while offline')
      return
    }
    toast.success(`Deleted ${doc.name}`)
    mutate()
  }

  return (
    <div className="flex flex-col gap-4">
      <ResumeToggle />

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">PDF only, up to 4 MB each.</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="Choose a PDF to upload"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          Upload PDF
        </Button>
      </div>

      {isLoading && documents.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading documents
        </p>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground text-pretty">
          Nothing here yet. Upload your resume, CV or portfolio and it will be saved to your account and kept on this
          device for offline use.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 truncate text-sm font-medium" title={doc.name}>
                    {doc.name}
                  </p>
                  <time dateTime={doc.uploadedAt} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatUploaded(doc.uploadedAt)}
                  </time>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pl-8">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatSize(doc.size)}</span>
                  {doc.offline ? (
                    <Badge variant="secondary">Available offline</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <CloudOff className="size-3" aria-hidden /> Online only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" disabled={busyId === doc.id} onClick={() => run(doc, 'share')}>
                    <Share2 className="size-4" aria-hidden /> Share
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Download ${doc.name}`}
                    disabled={busyId === doc.id}
                    onClick={() => run(doc, 'download')}
                  >
                    <Download className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${doc.name}`}
                    disabled={busyId === doc.id}
                    onClick={() => remove(doc)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
