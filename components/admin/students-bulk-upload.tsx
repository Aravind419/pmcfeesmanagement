"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useLocalDb } from "@/lib/local-db"
import { mutate as globalMutate } from "swr"

export function StudentsBulkUpload() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { db } = useLocalDb() // not used directly; revalidate after upload

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setErrors([])
    const file = inputRef.current?.files?.[0]
    if (!file) {
      setMessage("Please choose a CSV file.")
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set("file", file)
      const res = await fetch("/api/students/bulk-upload", {
        method: "POST",
        body: form,
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error || "Upload failed")
      }
      setMessage(`Upload complete. Added ${data.added ?? 0} students.`)
      if (Array.isArray(data.errors) && data.errors.length) {
        setErrors(data.errors)
      }
      // revalidate DB so list updates
      await globalMutate("/api/db")
    } catch (err: any) {
      setMessage(err?.message ?? "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Bulk Upload Students</h3>
          <p className="text-sm opacity-80">Upload a CSV with columns: roll, name, email, department, year</p>
        </div>
        <a className="underline text-sm" href="/api/students/sample-csv" download>
          Download sample CSV
        </a>
      </div>

      <form onSubmit={onUpload} className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="Students CSV"
          className="text-sm"
          disabled={busy}
        />
        <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={busy}>
          {busy ? "Uploading..." : "Bulk Upload"}
        </button>
      </form>

      {message && <div className="text-sm">{message}</div>}
      {errors.length > 0 && (
        <div className="text-sm text-red-600 space-y-1">
          {errors.map((er, i) => (
            <div key={i}>{er}</div>
          ))}
        </div>
      )}
    </div>
  )
}
