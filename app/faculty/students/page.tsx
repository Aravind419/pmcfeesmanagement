"use client"

import Navbar from "@/components/navbar"
import { useDb } from "@/lib/local-db"
import { totalOutstanding } from "@/lib/fees"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useMemo, useState } from "react"
import { currentUser } from "@/lib/local-db"
import Button from "@/components/ui/button"

type Comparator = "lt" | "eq" | "gt"
type PaidFilter = "all" | "paid" | "unpaid"

export default function FacultyStudentsPage() {
  const db = useDb()
  const me = currentUser()
  const scope = me?.role === "faculty" ? me.facultyScope : undefined
  const [department, setDepartment] = useState(scope?.department ?? "all")
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all")
  const [cmp, setCmp] = useState<Comparator>("eq")
  const [amount, setAmount] = useState<string>("")
  const [regNo, setRegNo] = useState<string>("")

  const departments = useMemo(
    () => Array.from(new Set(db.students.map((s) => s.department))).filter(Boolean),
    [db.students],
  )

  const rows = useMemo(() => {
    return db.students
      .filter((s) => {
        if (scope?.department && s.department !== scope.department) return false
        if (scope?.year && s.year !== scope.year) return false
        if (scope?.batch && s.batch !== scope.batch) return false
        return department !== "all" ? s.department === department : true
      })
      .filter((s) => (regNo ? s.registerNo.includes(regNo) : true))
      .map((s) => {
        const outstanding = totalOutstanding(db, s.registerNo)
        const paid = db.payments
          .filter((p) => p.studentRegisterNo === s.registerNo && p.status === "approved")
          .reduce((a, p) => a + p.total, 0)
        return { student: s, paid, outstanding }
      })
      .filter((r) => {
        if (paidFilter === "paid") return r.outstanding === 0
        if (paidFilter === "unpaid") return r.outstanding > 0
        return true
      })
      .filter((r) => {
        const val = Number.parseFloat(amount)
        if (Number.isNaN(val)) return true
        if (cmp === "lt") return r.outstanding < val
        if (cmp === "gt") return r.outstanding > val
        return r.outstanding === val
      })
  }, [db, department, paidFilter, cmp, amount, regNo, scope])

  const rowsMemo = rows

  function downloadCsv() {
    const rows = [
      ["Name", "RegisterNo", "Department", "Phone", "Paid", "Outstanding"],
      ...rowsMemo.map((r) => [
        r.student.name,
        r.student.registerNo,
        r.student.department,
        r.student.phone || "",
        r.paid.toFixed(2),
        r.outstanding.toFixed(2),
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "faculty-students.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function printList() {
    const html = `
      <html>
        <head><title>Students</title></head>
        <body>
          <h2>Students</h2>
          <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:sans-serif;">
            <thead><tr>
              <th>Name</th><th>Register No</th><th>Department</th><th>Phone</th><th>Paid</th><th>Outstanding</th>
            </tr></thead>
            <tbody>
              ${rowsMemo
                .map(
                  (r) =>
                    `<tr><td>${r.student.name}</td><td>${r.student.registerNo}</td><td>${r.student.department}</td><td>${r.student.phone || ""}</td><td style="text-align:right;">₹ ${r.paid.toFixed(2)}</td><td style="text-align:right;">₹ ${r.outstanding.toFixed(2)}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <script>window.print()</script>
        </body>
      </html>`
    const w = window.open("", "_blank", "width=900,height=700")
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Students (Faculty View)</CardTitle>
            <CardDescription>See personal, fees, and certificates with filters.</CardDescription>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={downloadCsv}>
                Download CSV
              </Button>
              <Button variant="secondary" onClick={printList}>
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-5">
              <div>
                <Select value={department} onValueChange={setDepartment} disabled={Boolean(scope?.department)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={paidFilter} onValueChange={(v) => setPaidFilter(v as PaidFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={cmp} onValueChange={(v) => setCmp(v as Comparator)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt">Below</SelectItem>
                    <SelectItem value="eq">Equal</SelectItem>
                    <SelectItem value="gt">Above</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Input placeholder="Filter by Register No" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3">
              {rows.map(({ student: s, paid, outstanding }) => (
                <details key={s.id} className="rounded border p-3 text-sm">
                  <summary className="cursor-pointer list-none">
                    <div className="grid grid-cols-2 md:grid-cols-6 items-center gap-2">
                      <div className="font-medium">{s.name}</div>
                      <div>{s.registerNo}</div>
                      <div className="hidden md:block">{s.department}</div>
                      <div className="hidden md:block">{s.phone || "-"}</div>
                      <div>Paid: ₹ {paid.toFixed(2)}</div>
                      <div>Outstanding: ₹ {outstanding.toFixed(2)}</div>
                    </div>
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-1 md:grid-cols-3">
                      <div>
                        <span className="font-medium">Branch:</span> {s.branch || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Year:</span> {s.year}
                      </div>
                      <div>
                        <span className="font-medium">Batch:</span> {s.batch}
                      </div>
                      <div>
                        <span className="font-medium">UMIS:</span> {s.umis || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {s.email || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {s.phone || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium mb-1">Certificates</div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {s.docs?.tc12 && (
                          <img
                            src={s.docs.tc12 || "/placeholder.svg"}
                            alt="12th TC"
                            className="h-32 w-full rounded border object-contain"
                          />
                        )}
                        {s.docs?.birth && (
                          <img
                            src={s.docs.birth || "/placeholder.svg"}
                            alt="Birth"
                            className="h-32 w-full rounded border object-contain"
                          />
                        )}
                        {s.docs?.firstGraduate && (
                          <img
                            src={s.docs.firstGraduate || "/placeholder.svg"}
                            alt="1st Graduate"
                            className="h-32 w-full rounded border object-contain"
                          />
                        )}
                        {s.docs?.mark10 && (
                          <img
                            src={s.docs.mark10 || "/placeholder.svg"}
                            alt="10th Marksheet"
                            className="h-32 w-full rounded border object-contain"
                          />
                        )}
                        {s.docs?.mark12 && (
                          <img
                            src={s.docs.mark12 || "/placeholder.svg"}
                            alt="12th Marksheet"
                            className="h-32 w-full rounded border object-contain"
                          />
                        )}
                      </div>

                      {s.customCertificates && s.customCertificates.length > 0 && (
                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          {s.customCertificates.map((c) => (
                            <div key={c.id} className="rounded border p-2">
                              <div className="font-medium">{c.name}</div>
                              {c.dataUrl && (
                                <img
                                  src={c.dataUrl || "/placeholder.svg"}
                                  alt={c.name}
                                  className="mt-2 h-32 w-full rounded border object-contain"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              ))}
              {rows.length === 0 && <p>No students match the filters.</p>}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
