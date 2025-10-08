"use client"

import useSWR, { mutate as globalMutate } from "swr"
import type { Db, User } from "./types"

const KEY = "/api/db"

const fetcher = async (url: string): Promise<Db> => {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to fetch DB (${res.status})`)
  }
  return (await res.json()) as Db
}

let latestDb: Db | null = null

function emptyDb(): Db {
  // mirror server's default
  return {
    users: [],
    students: [],
    fees: [
      { id: "fee_tuition", type: "tuition", name: "Tuition Fees", active: true, defaultAmount: 0 },
      { id: "fee_books", type: "books", name: "Book Fees", active: true, defaultAmount: 0 },
      { id: "fee_exam", type: "exam", name: "Exam Fees", active: true, defaultAmount: 0 },
      { id: "fee_bus", type: "bus", name: "Bus Fees", active: false, defaultAmount: 0 },
    ],
    allocations: [],
    payments: [],
    receipts: [],
    setupComplete: false,
    registrationOpen: true,
    registrationWindow: undefined,
    frozenDepartments: [],
    frozenStudents: [],
    upiConfig: { upiId: "aravindaravind@ptaxis", qrDataUrl: undefined },
    currentUserId: undefined,
  }
}

export function useDb() {
  const { data } = useSWR<Db>(KEY, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
  })
  if (data) latestDb = data
  return data ?? emptyDb()
}

export async function patchDb(patch: (db: Db) => void) {
  // optimistic update with rollback on error
  const prev = latestDb ?? emptyDb()
  const next: Db = JSON.parse(JSON.stringify(prev))
  patch(next)
  latestDb = next
  globalMutate(KEY, next, false)
  try {
    const res = await fetch(KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(next),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Failed to save")
    }
    // revalidate to get server's canonical state
    await globalMutate(KEY)
  } catch (e: any) {
    // rollback
    latestDb = prev
    globalMutate(KEY, prev, false)
    alert(`Save failed: ${e?.message ?? e}`)
    throw e
  }
}

export function setCurrentUser(_userId?: string) {
  // No-op: session cookie determines current user on server.
  // We still revalidate to pick up current user from cookie.
  globalMutate(KEY)
}

export function currentUser(): User | undefined {
  const db = latestDb
  if (!db) return undefined
  return db.users.find((u) => u.id === db.currentUserId)
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
  } finally {
    await globalMutate(KEY)
  }
}

// Utilities preserved for compatibility
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function hash(pw: string) {
  // demo only – matches server hash for compatibility
  return `h_${pw}`
}

export function useLocalDb() {
  const db = useDb()
  return {
    db,
    patchDb,
    setCurrentUser,
    currentUser,
    logout,
    uid,
  }
}

export async function refreshDb() {
  await globalMutate(KEY)
}
