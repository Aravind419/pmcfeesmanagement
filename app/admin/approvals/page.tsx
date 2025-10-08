"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb, uid } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { totalOutstanding } from "@/lib/fees"

export default function ApprovalsPage() {
  const db = useDb()
  const submitted = db.payments.filter((p) => p.status === "submitted")
  const approved = db.payments.filter((p) => p.status === "approved")
  const rejected = db.payments.filter((p) => p.status === "rejected")

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [targetId, setTargetId] = useState<string | undefined>(undefined)
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  function openReject(id: string) {
    setTargetId(id)
    setReason("")
    setRejectOpen(true)
  }

  const filteredSubmitted = submitted.filter((p) => {
    const t = new Date(p.createdAt).getTime()
    const f = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
    return t >= f && t <= to
  })
  const filteredApproved = approved.filter((p) => {
    const t = new Date(p.decidedAt || p.createdAt).getTime()
    const f = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
    return t >= f && t <= to
  })
  const filteredRejected = rejected.filter((p) => {
    const t = new Date(p.decidedAt || p.createdAt).getTime()
    const f = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
    return t >= f && t <= to
  })

  function groupByDay<T>(items: T[], getDateIso: (x: T) => string) {
    const map = new Map<string, T[]>()
    items.forEach((i) => {
      const d = new Date(getDateIso(i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Approvals</CardTitle>
            <CardDescription>Review submitted payments and approve or reject.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Date filter UI */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">From</span>
                <input
                  type="date"
                  className="rounded border p-1 text-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="text-sm">To</span>
                <input
                  type="date"
                  className="rounded border p-1 text-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            {/* Submitted grouped by date */}
            {filteredSubmitted.length === 0 && <p>No pending submissions.</p>}
            {groupByDay(filteredSubmitted, (p) => p.createdAt).map(([day, items]) => (
              <div key={day}>
                <h3 className="mt-2 text-sm font-semibold">{day}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => {
                    const student = db.students.find((s) => s.registerNo === p.studentRegisterNo)
                    const dept = student?.department || "-"
                    const unpaid = student ? totalOutstanding(db, student.registerNo) : 0
                    return (
                      <div key={p.id} className="rounded border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {student?.name} ({p.studentRegisterNo})
                            </div>
                            {/* Show department, unpaid and date */}
                            <div className="text-xs text-muted-foreground">Department: {dept}</div>
                            <div className="text-xs text-muted-foreground">
                              Submitted: {new Date(p.createdAt).toLocaleString()}
                            </div>
                            <div className="text-sm">Total: ₹ {p.total.toFixed(2)}</div>
                            <div className="text-xs">Remaining (Unpaid): ₹ {unpaid.toFixed(2)}</div>
                            {p.upiTransactionId && <div className="text-xs">UPI Txn: {p.upiTransactionId}</div>}
                          </div>
                          {/* Per-payment PDF */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const w = window.open("", "_blank", "width=720,height=900")
                              if (!w) return
                              const linesHtml = p.allocations
                                .map((line) => {
                                  const fee = db.fees.find((f) => f.id === line.feeId)
                                  return `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${fee?.name || line.feeId}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">₹ ${line.amount.toFixed(2)}</td></tr>`
                                })
                                .join("")
                              w.document.write(`
                                <html>
                                  <head><title>Payment ${p.id}</title></head>
                                  <body style="font-family:sans-serif;">
                                    <h2>Payment Submission</h2>
                                    <p><strong>Student:</strong> ${student?.name} (${p.studentRegisterNo})</p>
                                    <p><strong>Department:</strong> ${dept}</p>
                                    <p><strong>Date:</strong> ${new Date(p.createdAt).toLocaleString()}</p>
                                    <table style="border-collapse:collapse;width:100%;margin-top:12px;">
                                      <thead>
                                        <tr><th style="text-align:left;border:1px solid #ddd;padding:4px 8px;">Fee</th><th style="text-align:right;border:1px solid #ddd;padding:4px 8px;">Amount</th></tr>
                                      </thead>
                                      <tbody>${linesHtml}</tbody>
                                      <tfoot>
                                        <tr><td style="padding:6px 8px;border:1px solid #ddd;"><strong>Total</strong></td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;"><strong>₹ ${p.total.toFixed(2)}</strong></td></tr>
                                      </tfoot>
                                    </table>
                                    <p><strong>Remaining (Unpaid):</strong> ₹ ${unpaid.toFixed(2)}</p>
                                    <script>window.print();</script>
                                  </body>
                                </html>
                              `)
                              w.document.close()
                            }}
                          >
                            PDF
                          </Button>
                        </div>
                        {p.screenshotDataUrl && (
                          <div className="mt-2">
                            <img
                              src={p.screenshotDataUrl || "/placeholder.svg"}
                              alt="Payment screenshot"
                              className="max-h-64 rounded border object-contain"
                            />
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            className="bg-primary text-primary-foreground"
                            onClick={() => {
                              patchDb((db) => {
                                const x = db.payments.find((x) => x.id === p.id)!
                                x.status = "approved"
                                x.decidedAt = new Date().toISOString()
                                x.decidedBy = "admin"
                                const receiptId = uid("rcpt")
                                db.receipts.push({
                                  id: receiptId,
                                  paymentId: p.id,
                                  number: `PMC-${new Date().getFullYear()}-${String(db.receipts.length + 1).padStart(5, "0")}`,
                                  issuedAt: new Date().toISOString(),
                                })
                              })
                              alert(`Approved ₹ ${p.total.toFixed(2)} for ${p.studentRegisterNo}`)
                            }}
                          >
                            Approve & Issue Receipt
                          </Button>
                          <Button variant="secondary" onClick={() => openReject(p.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Approved Payments</CardTitle>
                <CardDescription>All approved submissions.</CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const filtered = approved.filter((p) => {
                    const t = new Date(p.decidedAt || p.createdAt).getTime()
                    const f = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY
                    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
                    return t >= f && t <= to
                  })
                  const rows = [
                    ["Student", "RegisterNo", "Date", "Total", "UPI Txn"],
                    ...filtered.map((p) => {
                      const s = db.students.find((x) => x.registerNo === p.studentRegisterNo)
                      return [
                        s?.name || "",
                        p.studentRegisterNo,
                        new Date(p.decidedAt || p.createdAt).toLocaleString(),
                        p.total.toFixed(2),
                        p.upiTransactionId || "",
                      ]
                    }),
                  ]
                  const csv = rows.map((r) => r.join(",")).join("\n")
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
                  const a = document.createElement("a")
                  a.href = URL.createObjectURL(blob)
                  a.download = "approved-payments.csv"
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
              >
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Approved grouped by date */}
            {filteredApproved.length === 0 && <p>No approved items.</p>}
            {groupByDay(filteredApproved, (p) => p.decidedAt || p.createdAt).map(([day, items]) => (
              <div key={day}>
                <h3 className="mt-2 text-sm font-semibold">{day}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => {
                    const student = db.students.find((s) => s.registerNo === p.studentRegisterNo)
                    const dept = student?.department || "-"
                    const unpaid = student ? totalOutstanding(db, student.registerNo) : 0
                    return (
                      <div key={p.id} className="rounded border p-3 text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {student?.name} ({p.studentRegisterNo})
                            </div>
                            <div className="text-xs text-muted-foreground">Department: {dept}</div>
                            <div>Total: ₹ {p.total.toFixed(2)}</div>
                            <div className="text-xs">Remaining (Unpaid): ₹ {unpaid.toFixed(2)}</div>
                          </div>
                          <div className="text-green-600">Approved</div>
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="secondary" onClick={() => window.print()}>
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Rejected Payments</CardTitle>
                <CardDescription>All rejected submissions with reasons.</CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const filtered = rejected.filter((p) => {
                    const t = new Date(p.decidedAt || p.createdAt).getTime()
                    const f = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY
                    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
                    return t >= f && t <= to
                  })
                  const rows = [
                    ["Student", "RegisterNo", "Date", "Total", "Reason"],
                    ...filtered.map((p) => {
                      const s = db.students.find((x) => x.registerNo === p.studentRegisterNo)
                      return [
                        s?.name || "",
                        p.studentRegisterNo,
                        new Date(p.decidedAt || p.createdAt).toLocaleString(),
                        p.total.toFixed(2),
                        p.rejectReason || "",
                      ]
                    }),
                  ]
                  const csv = rows.map((r) => r.join(",")).join("\n")
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
                  const a = document.createElement("a")
                  a.href = URL.createObjectURL(blob)
                  a.download = "rejected-payments.csv"
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
              >
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Rejected grouped by date */}
            {filteredRejected.length === 0 && <p>No rejected items.</p>}
            {groupByDay(filteredRejected, (p) => p.decidedAt || p.createdAt).map(([day, items]) => (
              <div key={day}>
                <h3 className="mt-2 text-sm font-semibold">{day}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => {
                    const student = db.students.find((s) => s.registerNo === p.studentRegisterNo)
                    const dept = student?.department || "-"
                    return (
                      <div key={p.id} className="rounded border p-3 text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {student?.name} ({p.studentRegisterNo})
                            </div>
                            <div className="text-xs text-muted-foreground">Department: {dept}</div>
                            <div>Total: ₹ {p.total.toFixed(2)}</div>
                            {p.rejectReason && <div className="mt-1 text-destructive">Reason: {p.rejectReason}</div>}
                          </div>
                          <div className="text-destructive">Rejected</div>
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="secondary" onClick={() => window.print()}>
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">A reason is required and will be shown to the student.</p>
              <Textarea
                placeholder="Enter rejection reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!reason.trim() || !targetId) return
                  patchDb((db) => {
                    const x = db.payments.find((pp) => pp.id === targetId)
                    if (!x) return
                    x.status = "rejected"
                    x.decidedAt = new Date().toISOString()
                    x.decidedBy = "admin"
                    x.rejectReason = reason.trim()
                  })
                  setRejectOpen(false)
                  setTargetId(undefined)
                  setReason("")
                  alert("Payment rejected with reason recorded.")
                }}
              >
                Confirm Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  )
}
