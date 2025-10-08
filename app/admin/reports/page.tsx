"use client"

import Navbar from "@/components/navbar"
import { useDb } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMemo, useState } from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Legend, Cell } from "recharts"
import * as XLSX from "xlsx"

type Range = "daily" | "weekly" | "monthly" | "yearly" | "custom"

export default function ReportsPage() {
  const db = useDb()
  const [range, setRange] = useState<Range>("daily")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [department, setDepartment] = useState<string>("")
  const [regNo, setRegNo] = useState<string>("")

  const departments = useMemo(
    () => Array.from(new Set(db.students.map((s) => s.department))).filter(Boolean),
    [db.students],
  )

  const { rows, totalApproved, byFee, pieData } = useMemo(() => {
    const now = new Date()
    let start = new Date(now)
    if (range === "daily") start.setHours(0, 0, 0, 0)
    if (range === "weekly") start.setDate(now.getDate() - 6)
    if (range === "monthly") start.setMonth(now.getMonth() - 1)
    if (range === "yearly") start.setFullYear(now.getFullYear() - 1)
    if (range === "custom") {
      start = from ? new Date(from) : new Date(0)
    }
    const end = range === "custom" ? (to ? new Date(to) : now) : now

    const paid = db.payments.filter((p) => {
      if (p.status !== "approved") return false
      const t = new Date(p.decidedAt || p.createdAt).getTime()
      if (t < start.getTime() || t > end.getTime()) return false
      if (regNo && p.studentRegisterNo !== regNo) return false
      if (department) {
        const s = db.students.find((x) => x.registerNo === p.studentRegisterNo)
        if (s?.department !== department) return false
      }
      return true
    })

    const rows = paid.map((p) => ({
      date: new Date(p.decidedAt || p.createdAt).toLocaleDateString(),
      reg: p.studentRegisterNo,
      total: p.total,
    }))
    const totalApproved = paid.reduce((a, p) => a + p.total, 0)

    const byFee: Record<string, number> = {}
    for (const p of paid) {
      for (const line of p.allocations) {
        byFee[line.feeId] = (byFee[line.feeId] ?? 0) + line.amount
      }
    }
    const pieData = Object.entries(byFee).map(([k, v]) => {
      const f = db.fees.find((x) => x.id === k)
      return { name: f?.name || k, value: v }
    })

    return { rows, totalApproved, byFee, pieData }
  }, [db, range, from, to, department, regNo])

  function downloadCSV() {
    const header = ["Date", "RegisterNo", "Amount"]
    const body = rows.map((r) => [r.date, r.reg, String(r.total)])
    const csv = [header, ...body].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fees-report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadExcel() {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, "fees-report.xlsx")
  }

  const BAR_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Daily, weekly, monthly, yearly or custom range with filters.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2 md:grid-cols-5">
              <div className="grid gap-1">
                <Label>Range</Label>
                <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {range === "custom" && (
                <>
                  <div className="grid gap-1">
                    <Label>From</Label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label>To</Label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </>
              )}
              <div className="grid gap-1">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
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
              <div className="grid gap-1">
                <Label>Register No</Label>
                <Input value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ChartContainer
                config={{ total: { label: "Approved Amount", color: "var(--primary)" } }}
                className="rounded border bg-background"
              >
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Bar dataKey="total" fill="var(--color-total)" name="Approved Amount" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </BarChart>
              </ChartContainer>

              <ChartContainer
                config={{ value: { label: "By Fee Type", color: "var(--accent)" } }}
                className="rounded border bg-background"
              >
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => window.print()}>Download PDF</Button>
              <Button variant="secondary" onClick={downloadCSV}>
                Download CSV
              </Button>
              <Button variant="secondary" onClick={downloadExcel}>
                Download Excel
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">Total Approved in range: ₹ {totalApproved.toFixed(2)}</div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
