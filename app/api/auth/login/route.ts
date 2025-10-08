import { type NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongo"
import type { Db as AppDb, Role } from "@/lib/types"
import { randomBytes } from "crypto"

const COLL = "state"
const SESS_COLL = "sessions"
const STATE_KEY = "cfm-db-v1"
const SESSION_COOKIE = "cfm_session"

function hash(pw: string) {
  // match client "demo" hash to avoid breaking existing flows
  return `h_${pw}`
}

export async function POST(req: NextRequest) {
  try {
    const { identifier, password, role } = (await req.json()) as {
      identifier: string
      password: string
      role: Role
    }

    if (!identifier || !password || !role) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    console.log("[v0] Login attempt:", { role, identifier: String(identifier).slice(0, 4) + "***" })

    const db = await getMongoDb()
    const doc = await db.collection(COLL).findOne<{ key: string; data: AppDb }>({ key: STATE_KEY })
    const data: AppDb = doc?.data ?? { users: [], students: [], fees: [], allocations: [], payments: [], receipts: [] }

    const pwHash = hash(password)

    // Find user candidate by role + identifier (without checking password first)
    let candidate = undefined as AppDb["users"][number] | undefined
    if (role === "student") {
      const s = data.students.find((st) => st.registerNo === identifier || st.phone === identifier)
      if (s) {
        candidate = data.users.find((u) => u.role === "student" && u.studentRegNo === s.registerNo)
      } else {
        candidate = data.users.find((u) => u.role === "student" && u.studentRegNo === identifier)
      }
    } else {
      candidate = data.users.find((u) => u.role === role && u.email === identifier)
    }

    if (!candidate) {
      return NextResponse.json({ error: "User not found for given identifier and role" }, { status: 404 })
    }
    if (candidate.passwordHash !== pwHash) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Create session
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString() // 12h
    await db.collection(SESS_COLL).insertOne({ token, userId: candidate.id, expiresAt })

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
    console.log("[v0] Login error:", err?.message)
    return NextResponse.json({ error: "Login failed", details: err?.message }, { status: 500 })
  }
}
