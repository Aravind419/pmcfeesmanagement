import { type NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongo"
import type { Db as AppDb, User, Student } from "@/lib/types"
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

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as {
      name: string
      registerNo: string
      department: string
      year: string
      batch: string
      email: string
      phone?: string
      password: string
    }

    const required = ["name", "registerNo", "department", "year", "batch", "email", "password"] as const
    for (const k of required) {
      if (!(payload as any)[k]) {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 })
      }
    }

    console.log("[v0] Register attempt:", {
      reg: payload.registerNo,
      email: String(payload.email).slice(0, 3) + "***",
    })

    const db = await getMongoDb()
    const doc = await db.collection(COLL).findOne<{ key: string; data: AppDb }>({ key: STATE_KEY })
    const data: AppDb =
      doc?.data ??
      ({
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
        registrationOpen: true,
        upiConfig: { upiId: "aravindaravind@ptaxis", qrDataUrl: undefined },
      } as any)

    if (data.students.find((s) => s.registerNo === payload.registerNo)) {
      return NextResponse.json({ error: "Register Number already exists" }, { status: 409 })
    }
    if (data.users.find((u) => u.email === payload.email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const studentId = uid("student")
    const userId = uid("user")

    const newStudent: Student = {
      id: studentId,
      name: payload.name,
      registerNo: payload.registerNo,
      department: payload.department,
      year: payload.year,
      batch: payload.batch,
      email: payload.email,
      phone: payload.phone,
      auditTrail: [{ at: new Date().toISOString(), by: payload.email, action: "self-register" }],
    }
    const newUser: User = {
      id: userId,
      email: payload.email,
      passwordHash: hash(payload.password),
      role: "student",
      studentRegNo: payload.registerNo,
      createdAt: new Date().toISOString(),
    }

    data.students.push(newStudent)
    data.users.push(newUser)

    await db
      .collection(COLL)
      .updateOne(
        { key: STATE_KEY },
        { $set: { key: STATE_KEY, data, updatedAt: new Date().toISOString() } },
        { upsert: true },
      )

    // Create session
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    await db.collection(SESS_COLL).insertOne({ token, userId, expiresAt })

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
    console.log("[v0] Registration error:", err?.message)
    return NextResponse.json({ error: "Registration failed", details: err?.message }, { status: 500 })
  }
}
