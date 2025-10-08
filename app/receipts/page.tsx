"use client"

import Navbar from "@/components/navbar"
import { useDb } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { currentUser } from "@/lib/local-db"
import { outstandingByFee } from "@/lib/fees"

export default function ReceiptsPage() {
  const db = useDb()
  const user = currentUser()
  const student = db.students.find((s) => s.registerNo === user?.studentRegNo)
  const payments = db.payments.filter((p) => p.studentRegisterNo === student?.registerNo && p.status === "approved")
  const receipts = db.receipts.filter((r) => payments.some((p) => p.id === r.paymentId))

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Receipts</CardTitle>
            <CardDescription>Download or print digital receipts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {receipts.length === 0 && <p>No receipts yet.</p>}
            {receipts.map((r) => {
              const p = payments.find((x) => x.id === r.paymentId)!
              const remaining = student ? outstandingByFee(db, student.registerNo) : {}
              return (
                <div key={r.id} className="rounded border p-3 print:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Er.Perumal Manimekalai College Of Engineering</div>
                      <div className="font-medium">Receipt #{r.number}</div>
                      <div className="text-sm text-muted-foreground">Date: {new Date(r.issuedAt).toLocaleString()}</div>
                      <div className="text-sm">
                        Student: {student?.name} ({student?.registerNo})
                      </div>
                    </div>
                    <Button onClick={() => window.print()}>Download PDF</Button>
                  </div>
                  <div className="mt-3">
                    <div className="font-medium mb-1">Paid Items</div>
                    <ul className="grid gap-1 text-sm">
                      {p.allocations.map((line, i) => {
                        const fee = db.fees.find((f) => f.id === line.feeId)
                        const rem = remaining[line.feeId] ?? 0
                        return (
                          <li key={i} className="flex items-center justify-between">
                            <span>{fee?.name || line.feeId}</span>
                            <span>
                              ₹ {line.amount.toFixed(2)} • Balance: ₹ {rem.toFixed(2)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="font-semibold">Total Paid</span>
                      <span className="font-semibold">₹ {p.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
