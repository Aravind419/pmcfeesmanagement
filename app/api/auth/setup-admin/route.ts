import { type NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongo"
import type { Db as AppDb, User } from "@/lib/types"
import { randomBytes } from "crypto"

const COLL = "state"
const SESS_COLL = "sessions"
const STATE_KEY = "cfm-db-v1"
const SESSION_COOKIE = "cfm_session"

function hash(pw: string) {
  return `h_${pw}`
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

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

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string }
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const dbConn = await getMongoDb()
    const doc = await dbConn.collection(COLL).findOne<{ key: string; data: AppDb }>({ key: STATE_KEY })
    const data: AppDb = doc?.data ?? emptyDb()

    // If any admin already exists, block
    const existingAdmin = data.users.find((u) => u.role === "admin")
    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 })
    }

    // Also guard against duplicate email in users
    if (data.users.some((u) => u.email === email)) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const userId = uid("user")
    const newAdmin: User = {
      id: userId,
      email,
      passwordHash: hash(password),
      role: "admin",
      createdAt: new Date().toISOString(),
    }

    data.users.push(newAdmin)
    data.setupComplete = true

    await dbConn
      .collection(COLL)
      .updateOne(
        { key: STATE_KEY },
        { $set: { key: STATE_KEY, data, updatedAt: new Date().toISOString() } },
        { upsert: true },
      )

    // Create session
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    await dbConn.collection(SESS_COLL).insertOne({ token, userId, expiresAt })

    const res = NextResponse.json({ ok: true }, { status: 200 })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12,
    })
    return res
  } catch (err: any) {
    console.log("[v0] setup-admin error:", err?.message)
    return NextResponse.json({ error: "Admin setup failed", details: err?.message }, { status: 500 })
  }
}
