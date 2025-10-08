"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDb } from "@/lib/local-db"
import { mutate as globalMutate } from "swr"

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
const YEARS = ["1", "2", "3", "4"]
const BATCHES = ["2022-2026", "2023-2027", "2024-2028", "2025-2029", "2026-2030"]

export default function RegisterForm() {
  const [name, setName] = useState("")
  const [registerNo, setRegisterNo] = useState("")
  const [department, setDepartment] = useState("")
  const [year, setYear] = useState("")
  const [batch, setBatch] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  useDb() // warm cache

  const deptOptions = DEPARTMENTS
  const yearOptions = YEARS
  const batchOptions = BATCHES

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Register Number</Label>
        <Input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Department</Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {deptOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Year</Label>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Batch</Label>
        <Select value={batch} onValueChange={setBatch}>
          <SelectTrigger>
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {batchOptions.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        className="bg-accent text-accent-foreground"
        disabled={loading}
        onClick={async () => {
          if (!name || !registerNo || !department || !year || !batch || !email || !password) {
            setError("Please fill all required fields.")
            return
          }
          try {
            setError(null)
            setLoading(true)
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name,
                registerNo,
                department,
                year,
                batch,
                email,
                phone,
                password,
              }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
              throw new Error(body.error || "Registration failed")
            }
            await globalMutate("/api/db")
            window.location.href = "/dashboard"
          } catch (e: any) {
            setError(e?.message ?? "Registration failed")
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? "Creating..." : "Create Student Account"}
      </Button>
    </div>
  )
}
