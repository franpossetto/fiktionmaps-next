"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  multiple?: boolean
  preview?: boolean
  previewAspect?: number
}

export function DragDropZone({
  onFilesSelected,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  preview = true,
  previewAspect = 2 / 3,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const generatePreviews = (files: File[]) => {
    const newPreviews: string[] = []
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string)
          }
        }
        reader.readAsDataURL(file)
      }
    })
    return newPreviews
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      if (maxSize && file.size > maxSize) {
        return false
      }
      return true
    })

    if (!multiple && validFiles.length > 0) {
      validFiles.splice(1)
    }

    setSelectedFiles(validFiles)
    if (preview) {
      setPreviews(generatePreviews(validFiles))
    }
    onFilesSelected(validFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    const newPreviews = previews.filter((_, i) => i !== index)
    setPreviews(newPreviews)
    onFilesSelected(newFiles)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-all cursor-pointer p-8 text-center",
          isDragging
            ? "border-foreground bg-foreground/10"
            : selectedFiles.length > 0
              ? "border-green-500 bg-green-500/5"
              : "border-border bg-muted/30 hover:border-foreground/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">
              {isDragging ? "Drop files here" : "Drag files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              {maxSize && `Max ${(maxSize / 1024 / 1024).toFixed(1)}MB`}
            </p>
          </div>
        </div>
      </div>

      {/* File previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Selected Files</p>
          {preview && previews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previews.map((preview, i) => (
                <div
                  key={i}
                  className="relative group overflow-hidden rounded-lg bg-muted/40"
                  style={{ aspectRatio: previewAspect }}
                >
                  <Image src={preview} alt="Preview" fill className="object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
