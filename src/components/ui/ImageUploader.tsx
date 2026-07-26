'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
}

export default function ImageUploader({ value, onChange, maxFiles = 4 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList) => {
    if (value.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed.`)
      return
    }
    setUploading(true)
    setError('')
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Only images and videos are supported.')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Files must be under 10MB.')
        continue
      }

      const ext = file.name.split('.').pop()
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error: err } = await supabase.storage
        .from('social-media')
        .upload(path, file, { upsert: false })

      if (err) { setError(err.message); continue }

      const { data: urlData } = supabase.storage
        .from('social-media')
        .getPublicUrl(data.path)

      uploaded.push(urlData.publicUrl)
    }

    onChange([...value, ...uploaded])
    setUploading(false)
  }

  const remove = async (url: string) => {
    // Extract path from URL
    const path = url.split('/storage/v1/object/public/social-media/')[1]
    if (path) await supabase.storage.from('social-media').remove([path])
    onChange(value.filter(u => u !== url))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
  }

  return (
    <div>
      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {value.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden bg-stone-100 aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => remove(url)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {i === 0 && value.length > 1 && (
                <span className="absolute bottom-1.5 left-1.5 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded-md">Cover</span>
              )}
            </div>
          ))}
          {/* Add more slot */}
          {value.length < maxFiles && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-stone-300" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      {value.length === 0 && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-5 h-5 text-stone-400" />
            </div>
          )}
          <p className="text-sm font-medium text-stone-600">
            {uploading ? 'Uploading…' : 'Drop images here or click to browse'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">PNG, JPG, GIF, MP4 up to 10MB · Max {maxFiles} files</p>
        </div>
      )}

      {/* Uploading indicator for add-more case */}
      {uploading && value.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 mt-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && upload(e.target.files)}
      />
    </div>
  )
}

// Need to import Plus separately since it's used inline
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
