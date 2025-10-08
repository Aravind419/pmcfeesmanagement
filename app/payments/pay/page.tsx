"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb, uid } from "@/lib/local-db"
import { currentUser } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import { outstandingByFee } from "@/lib/fees"
import { sumAllocatedByFee, sumPaidByFee } from "@/lib/fees"
import { Checkbox } from "@/components/ui/checkbox"
import QR from "@/components/payments/qr"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

function fileToDataUrl(file?: File): Promise<string | undefined> {
  if (!file) return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PayPage() {
  const db = useDb()
  const user = currentUser()
  const student = db.students.find((s) => s.registerNo === user?.studentRegNo)

  const frozenDept = student && (db.frozenDepartments || []).includes(student.department)
  const frozenStudent = student && (db.frozenStudents || []).includes(student.registerNo)
  const blocked = frozenDept || frozenStudent

  const outstanding = useMemo(() => (student ? outstandingByFee(db, student.registerNo) : {}), [db, student])
  const feeItems = Object.entries(outstanding)
    .map(([feeId, bal]) => {
      const f = db.fees.find((x) => x.id === feeId)
      return { feeId, name: f?.name || feeId, balance: bal }
    })
    .filter((x) => x.balance > 0)

  const [inputs, setInputs] = useState<Record<string, { selected: boolean; amount: string }>>({})
  const total = useMemo(() => {
    return feeItems.reduce((sum, it) => {
      const x = inputs[it.feeId]
      if (!x?.selected) return sum
      const val = Math.min(Number(x.amount || 0), it.balance)
      return sum + (isFinite(val) ? val : 0)
    }, 0)
  }, [inputs, feeItems])

  const [upiTxn, setUpiTxn] = useState("")
  const [file, setFile] = useState<File | undefined>()
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "approved" | "rejected">("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  const totals = useMemo(() => {
    if (!student) return { totalFees: 0, alreadyPaid: 0 }
    const alloc = sumAllocatedByFee(db, student.registerNo)
    const paid = sumPaidByFee(db, student.registerNo)
    const totalFees = Object.values(alloc).reduce((a, b) => a + b, 0)
    const alreadyPaid = Object.values(paid).reduce((a, b) => a + b, 0)
    return { totalFees, alreadyPaid }
  }, [db, student])

  const remainingAfter = Math.max(0, totals.totalFees - (totals.alreadyPaid + total))

  const upiId = db.upiConfig?.upiId || "aravindaravind@ptaxis"
  const tn = student?.registerNo ? `Fees ${student.registerNo}` : "Fees"
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    "PMC TECH",
  )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`
  const qrImage = db.upiConfig?.qrDataUrl || undefined

  const mySubmissions = db.payments
    .filter((p) => p.studentRegisterNo === student?.registerNo)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  function isWithin(dateIso: string) {
    const d = new Date(dateIso)
    if (fromDate && d < new Date(fromDate)) return false
    if (toDate && d > new Date(toDate + "T23:59:59")) return false
    return true
  }

  const filteredSubs = mySubmissions
    .filter((p) => (filterStatus === "all" ? true : p.status === filterStatus))
    .filter((p) => isWithin(p.createdAt))

  function downloadFilteredCSV() {
    const rows = [
      ["ID", "Date", "Status", "UPI Transaction", "Total", "Lines"],
      ...filteredSubs.map((p) => [
        p.id,
        new Date(p.createdAt).toLocaleString(),
        p.status,
        p.upiTransactionId || "",
        p.total.toFixed(2),
        p.allocations
          .map((l) => {
            const fee = db.fees.find((f) => f.id === l.feeId)
            return `${fee?.name || l.feeId}:${l.amount.toFixed(2)}`
          })
          .join(" | "),
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "my-payments.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!student) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-4xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>Student not found.</CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees</CardTitle>
            <CardDescription>Select fee types and enter amount to pay.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {blocked && (
              <div className="rounded border border-destructive p-2 text-sm text-destructive">
                your account is freezed by admin
              </div>
            )}

            <div className="grid gap-1 rounded border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Total Fees</span>
                <span>₹ {totals.totalFees.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Already Paid</span>
                <span>₹ {totals.alreadyPaid.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paying Now</span>
                <span>₹ {total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Remaining After Payment</span>
                <span>₹ {remainingAfter.toFixed(2)}</span>
              </div>
            </div>

            <ul className="grid gap-2">
              {feeItems.map((it) => (
                <li key={it.feeId} className="grid items-center gap-2 md:grid-cols-[auto_1fr_auto] rounded border p-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={inputs[it.feeId]?.selected || false}
                      onCheckedChange={(v) =>
                        setInputs((prev) => ({
                          ...prev,
                          [it.feeId]: { selected: Boolean(v), amount: prev[it.feeId]?.amount || "" },
                        }))
                      }
                    />
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">Balance: ₹ {it.balance.toFixed(2)}</div>
                    </div>
                  </div>
                  <div />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      className="w-32"
                      value={inputs[it.feeId]?.amount || ""}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [it.feeId]: { selected: prev[it.feeId]?.selected ?? false, amount: e.target.value },
                        }))
                      }
                      placeholder="Enter amount"
                      disabled={!inputs[it.feeId]?.selected}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total to Pay</span>
              <span className="font-semibold">₹ {total.toFixed(2)}</span>
            </div>

            <div className="text-sm">
              Use this UPI ID to pay: <span className="font-medium">{upiId}</span>
            </div>

            <a className="mt-1 inline-block" href={total > 0 ? upiLink : undefined} aria-disabled={total <= 0}>
              <Button className="w-full" disabled={total <= 0}>
                Open UPI App
              </Button>
            </a>

            {total > 0 && (
              <div className="mt-2 flex flex-col items-center">
                <QR text={upiLink} imageSrc={qrImage} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Scan this QR or tap "Open UPI App" to pay. Then submit proof for approval.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Payment Proof</CardTitle>
            <CardDescription>Upload screenshot and UPI Transaction ID.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>UPI Transaction ID</Label>
              <Input value={upiTxn} onChange={(e) => setUpiTxn(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Payment Screenshot</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0])} />
            </div>
            <Button
              disabled={blocked || total <= 0}
              onClick={async () => {
                const screenshotDataUrl = await fileToDataUrl(file)
                const paymentId = uid("pay")
                const lines = feeItems
                  .map((it) => {
                    const x = inputs[it.feeId]
                    if (!x?.selected) return null
                    const val = Math.min(Number(x.amount || 0), it.balance)
                    if (!isFinite(val) || val <= 0) return null
                    return { feeId: it.feeId, amount: val }
                  })
                  .filter(Boolean) as Array<{ feeId: string; amount: number }>
                // Replace localStorage guard with DB-based check
                if (upiTxn && db.payments.some((p) => (p.upiTransactionId || "") === upiTxn)) {
                  alert("This UPI Transaction ID was already submitted. Please verify and use a different one.")
                  return
                }

                patchDb((db) => {
                  db.payments.push({
                    id: paymentId,
                    studentRegisterNo: student.registerNo,
                    allocations: lines,
                    total,
                    upiTransactionId: upiTxn || undefined,
                    screenshotDataUrl,
                    status: "submitted",
                    createdAt: new Date().toISOString(),
                    submittedAt: new Date().toISOString(), // explicit submitted date
                  })
                })
                alert(`Payment submitted: ₹ ${total.toFixed(2)} for ${student.registerNo}`)
              }}
            >
              Submit for Approval
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>My Payment Submissions</CardTitle>
            <CardDescription>Track approval status and reasons.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {/* Filters and bulk export */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label>Status</Label>
                <Select
                  // @ts-ignore
                  onValueChange={(v) => setFilterStatus(v as any)}
                  value={filterStatus}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={downloadFilteredCSV}>
                Download All (CSV)
              </Button>
            </div>

            {/* existing submissions list follows */}
            {filteredSubs.map((p) => (
              <div key={p.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div>Submitted: {new Date(p.createdAt).toLocaleString()}</div>
                    <div>Total: ₹ {p.total.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      Status:{" "}
                      <span
                        className={
                          p.status === "approved"
                            ? "text-green-600"
                            : p.status === "rejected"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <Button
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
                          <!DOCTYPE html>
                          <html>
                            <head><title>Payment Submission ${p.id}</title></head>
                            <body style="font-family:sans-serif;">
                              <h2>Payment Submission</h2>
                              <p><strong>Student:</strong> ${student.name} (${student.registerNo})</p>
                              <p><strong>Date:</strong> ${new Date(p.createdAt).toLocaleString()}</p>
                              <p><strong>Status:</strong> ${p.status.toUpperCase()}${
                                p.status === "rejected" && p.rejectReason ? ` • Reason: ${p.rejectReason}` : ""
                              }${p.upiTransactionId ? ` • UPI TXN: ${p.upiTransactionId}` : ""}</p>
                              <table style="border-collapse:collapse;width:100%;margin-top:12px;">
                                <thead>
                                  <tr><th style="text-align:left;border:1px solid #ddd;padding:4px 8px;">Fee</th><th style="text-align:right;border:1px solid #ddd;padding:4px 8px;">Amount</th></tr>
                                </thead>
                                <tbody>${linesHtml}</tbody>
                                <tfoot>
                                  <tr><td style="padding:6px 8px;border:1px solid #ddd;"><strong>Total</strong></td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;"><strong>₹ ${p.total.toFixed(2)}</strong></td></tr>
                                </tfoot>
                              </table>
                              <script>window.print();</script>
                            </body>
                          </html>
                        `)
                        w.document.close()
                      }}
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>
                {p.status === "rejected" && p.rejectReason && (
                  <div className="mt-1 text-destructive">Reason: {p.rejectReason}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
