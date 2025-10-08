import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongo"

type StudentRow = {
  roll: string
  name: string
  email: string
  department?: string
  year?: string | number
}

function parseCsv(text: string): StudentRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = (k: string) => header.indexOf(k)
  const out: StudentRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",")
    out.push({
      roll: (cols[idx("roll")] ?? "").trim(),
      name: (cols[idx("name")] ?? "").trim(),
      email: (cols[idx("email")] ?? "").trim(),
      department: (cols[idx("department")] ?? "").trim(),
      year: (cols[idx("year")] ?? "").trim(),
    })
  }
  return out
}

async function getSessionUser(req: NextRequest) {
  try {
    const token = req.cookies.get("cfm_session")?.value
    if (!token) return undefined
    const sessions = await getCollection("sessions")
    const s = await sessions.findOne({ token })
    return s?.userId as string | undefined
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  try {
    // AuthN
    const userId = await getSessionUser(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const ctype = req.headers.get("content-type") || ""
    if (!ctype.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })
    }
    const form = await req.formData()
    const file = form.get("file")
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const text = await (file as File).text()
    const rows = parseCsv(text)
    const errors: string[] = []
    const valid: StudentRow[] = []

    for (const [i, r] of rows.entries()) {
      if (!r.roll || !r.name || !r.email) {
        errors.push(`Row ${i + 2}: Missing required fields`)
        continue
      }
      // rudimentary email check
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) {
        errors.push(`Row ${i + 2}: Invalid email`)
        continue
      }
      valid.push(r)
    }

    const stateCol = await getCollection<any>("app_state")
    const state = (await stateCol.findOne({ _id: "singleton" })) ?? { users: [], students: [] }
    const existing = new Map<string, any>()
    for (const s of state.students ?? []) {
      if (s.roll) existing.set(`roll:${String(s.roll).toLowerCase()}`, s)
      if (s.email) existing.set(`email:${String(s.email).toLowerCase()}`, s)
    }

    const toAdd: any[] = []
    for (const r of valid) {
      const rollKey = `roll:${r.roll.toLowerCase()}`
      const emailKey = `email:${r.email.toLowerCase()}`
      if (existing.has(rollKey) || existing.has(emailKey)) {
        errors.push(`Duplicate: ${r.roll} / ${r.email}`)
        continue
      }
      const newStudent = {
        id: `stu_${Math.random().toString(36).slice(2, 10)}`,
        roll: r.roll,
        name: r.name,
        email: r.email,
        department: r.department ?? "",
        year: r.year ?? "",
        createdAt: new Date(),
      }
      toAdd.push(newStudent)
      existing.set(rollKey, true)
      existing.set(emailKey, true)
    }

    const nextStudents = [...(state.students ?? []), ...toAdd]
    await stateCol.updateOne({ _id: "singleton" }, { $set: { ...state, students: nextStudents } }, { upsert: true })

    return NextResponse.json(
      { ok: true, added: toAdd.length, errors },
      { status: errors.length ? 207 /* Multi-Status */ : 200 },
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bulk upload failed" }, { status: 500 })
  }
}
