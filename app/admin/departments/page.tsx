"use client"

import { useMemo, useState } from "react"
import { useLocalDb, hash } from "@/lib/local-db"

const DEPARTMENTS = [
  "IT",
  "CSE",
  "ECE",
  "EEE",
  "AI&ML",
  "CIVIL",
  "MECHANICAL",
  "AERONAUTICAL",
  "MCA",
  "MECHATRONICS",
  "CSBS",
  "AIDS",
  "CHEMICAL ENGINEERING",
]

export default function DepartmentsAdminPage() {
  const { db, patchDb } = useLocalDb()
  const [active, setActive] = useState<string>(DEPARTMENTS[0])

  const students = useMemo(() => db.students.filter((s) => s.department === active), [db.students, active])

  function updatePassword(registerNo: string, password: string) {
    if (!password) return
    patchDb((d) => {
      const user = d.users.find((u) => u.role === "student" && u.studentRegNo === registerNo)
      if (user) user.passwordHash = hash(password)
    })
    alert(`Password updated for ${registerNo}`)
  }

  function downloadNames() {
    const rows = students.map((s) => [s.name])
    const csv = ["Name", ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${active}-students.csv`
    a.click()
  }

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Departments</h1>
      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            className={`px-3 py-1 rounded border ${d === active ? "bg-accent" : ""}`}
            onClick={() => setActive(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">{active} Students</h2>
        <button className="px-3 py-1 rounded border" onClick={downloadNames}>
          Download Names (CSV)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Register No</th>
              <th className="p-2">Year</th>
              <th className="p-2">Batch</th>
              <th className="p-2">Password</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.registerNo}</td>
                <td className="p-2">{s.year ?? "-"}</td>
                <td className="p-2">{s.batch ?? "-"}</td>
                <td className="p-2">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="password"
                    placeholder="Set new password"
                    onBlur={(e) => updatePassword(s.registerNo, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
