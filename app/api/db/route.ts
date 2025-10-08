import { type NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongo"
import type { Db as AppDb } from "@/lib/types"

// Use a single document key to store the whole app state
const STATE_KEY = "cfm-db-v1"
const COLL = "state"
const SESS_COLL = "sessions"
const SESSION_COOKIE = "cfm_session"

function emptyDb(): AppDb {
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

async function getSessionUserId(req: NextRequest): Promise<string | undefined> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return undefined
  const db = await getMongoDb()
  const sess = await db.collection(SESS_COLL).findOne<{ token: string; userId: string; expiresAt: string }>({ token })
  if (!sess) return undefined
  if (new Date(sess.expiresAt).getTime() < Date.now()) {
    // expire the session
    await db.collection(SESS_COLL).deleteOne({ token })
    return undefined
  }
  return sess.userId
}

export async function GET(req: NextRequest) {
  try {
    const db = await getMongoDb()
    const doc = await db.collection(COLL).findOne<{ key: string; data: AppDb }>({ key: STATE_KEY })
    const userId = await getSessionUserId(req)
    const data: AppDb = doc?.data ?? emptyDb()
    // reflect current session userId (do not persist here)
    const merged: AppDb = { ...data, currentUserId: userId }
    return NextResponse.json(merged, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load data", details: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const incoming = (await req.json()) as AppDb | undefined
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    // Basic structural validation
    if (!Array.isArray(incoming.users) || !Array.isArray(incoming.students)) {
      return NextResponse.json({ error: "Malformed Db structure" }, { status: 400 })
    }

    const db = await getMongoDb()
    // Persist without currentUserId (session carries auth)
    const { currentUserId: _omit, ...rest } = incoming as any
    await db
      .collection(COLL)
      .updateOne(
        { key: STATE_KEY },
        { $set: { key: STATE_KEY, data: rest, updatedAt: new Date().toISOString() } },
        { upsert: true },
      )

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save data", details: err?.message }, { status: 500 })
  }
}
