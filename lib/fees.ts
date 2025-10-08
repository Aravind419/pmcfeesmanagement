import type { Db, PaymentSubmission } from "./types"

export function sumAllocatedByFee(db: Db, regNo: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of db.allocations.filter((x) => x.studentRegisterNo === regNo)) {
    out[a.feeId] = (out[a.feeId] ?? 0) + a.amount
  }
  return out
}

export function approvedPaymentsFor(db: Db, regNo: string): PaymentSubmission[] {
  return db.payments.filter((p) => p.studentRegisterNo === regNo && p.status === "approved")
}

export function sumPaidByFee(db: Db, regNo: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of approvedPaymentsFor(db, regNo)) {
    for (const line of p.allocations) {
      out[line.feeId] = (out[line.feeId] ?? 0) + line.amount
    }
  }
  return out
}

export function outstandingByFee(db: Db, regNo: string): Record<string, number> {
  const alloc = sumAllocatedByFee(db, regNo)
  const paid = sumPaidByFee(db, regNo)
  const keys = new Set([...Object.keys(alloc), ...Object.keys(paid)])
  const out: Record<string, number> = {}
  for (const k of keys) {
    out[k] = Math.max(0, (alloc[k] ?? 0) - (paid[k] ?? 0))
  }
  return out
}

export function totalOutstanding(db: Db, regNo: string): number {
  const o = outstandingByFee(db, regNo)
  return Object.values(o).reduce((a, b) => a + b, 0)
}
