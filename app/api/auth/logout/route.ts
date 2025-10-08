import { type NextRequest, NextResponse } from "next/server"
import { getMongoDb } from "@/lib/mongo"

const SESS_COLL = "sessions"
const SESSION_COOKIE = "cfm_session"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (token) {
      const db = await getMongoDb()
      await db.collection(SESS_COLL).deleteOne({ token })
    }
    const res = NextResponse.json({ ok: true }, { status: 200 })
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: "Logout failed", details: err?.message }, { status: 500 })
  }
}
