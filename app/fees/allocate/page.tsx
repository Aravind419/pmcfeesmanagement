"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb, uid } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"

export default function AllocateFeesPage() {
  const db = useDb()

  const [department, setDepartment] = useState<string>("all")
  const [selectedRegs, setSelectedRegs] = useState<string[]>([])
  const [feeId, setFeeId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [allFees, setAllFees] = useState<boolean>(false)

  const students = useMemo(
    () => db.students.filter((s) => (department !== "all" ? s.department === department : true)),
    [db.students, department],
  )
  const departments = useMemo(
    () => Array.from(new Set(db.students.map((s) => s.department))).filter(Boolean),
    [db.students],
  )

  const activeFees = db.fees.filter((f) => f.active)

  const toggleReg = (reg: string) => {
    setSelectedRegs((prev) => (prev.includes(reg) ? prev.filter((x) => x !== reg) : [...prev, reg]))
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Allocate Fees</CardTitle>
            <CardDescription>Assign fees to one or more students with filters.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
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
              <div className="grid gap-2 md:col-span-2">
                <Label>Students</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto rounded border p-2">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRegs.includes(s.registerNo)}
                        onCheckedChange={() => toggleReg(s.registerNo)}
                      />
                      <span className="text-sm">
                        {s.registerNo} - {s.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Apply to all active fees</Label>
                <div className="flex items-center gap-2">
                  <Checkbox checked={allFees} onCheckedChange={(v) => setAllFees(Boolean(v))} />
                  <span className="text-sm">All active fees</span>
                </div>
              </div>
            </div>

            {!allFees && (
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Fee Type</Label>
                  <Select value={feeId} onValueChange={setFeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFees.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Amount (optional)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Leave blank to use default"
                  />
                </div>
              </div>
            )}

            <div>
              <Button
                onClick={() => {
                  if (selectedRegs.length === 0) return
                  const newRows: Array<{ reg: string; fee: string; amount: number }> = []
                  let totalAmt = 0
                  patchDb((db) => {
                    for (const reg of selectedRegs) {
                      if (allFees) {
                        for (const f of activeFees) {
                          db.allocations.push({
                            id: uid("alloc"),
                            studentRegisterNo: reg,
                            feeId: f.id,
                            amount: f.defaultAmount,
                          })
                          newRows.push({ reg, fee: f.name, amount: f.defaultAmount })
                          totalAmt += f.defaultAmount
                        }
                      } else {
                        if (!feeId) continue
                        const f = db.fees.find((x) => x.id === feeId)!
                        const amt = Number(amount || "") || f.defaultAmount
                        db.allocations.push({
                          id: uid("alloc"),
                          studentRegisterNo: reg,
                          feeId: feeId,
                          amount: amt,
                        })
                        newRows.push({ reg, fee: f.name, amount: amt })
                        totalAmt += amt
                      }
                    }
                  })
                  alert(`Fees allocated to ${selectedRegs.length} student(s). Total amount: ₹ ${totalAmt.toFixed(2)}`)
                  const csv = ["Register No,Fee,Amount", ...newRows.map((r) => `${r.reg},${r.fee},${r.amount}`)].join(
                    "\n",
                  )
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `allocations-${new Date().toISOString().slice(0, 10)}.csv`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                }}
              >
                Add Allocation(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
