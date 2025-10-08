"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb, uid, hash } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function UsersPage() {
  const db = useDb()
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

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"office" | "principal" | "hod" | "faculty">("office")
  const [facultyDept, setFacultyDept] = useState<string>("")
  const [facultyYear, setFacultyYear] = useState<string>("")
  const [facultyBatch, setFacultyBatch] = useState<string>("")

  const deptOptions = DEPARTMENTS
  const yearOptions = YEARS
  const batchOptions = BATCHES

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create credentials for staff roles.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "faculty" && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label>Department</Label>
                  <Select value={facultyDept} onValueChange={setFacultyDept}>
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
                <div className="grid gap-1">
                  <Label>Year</Label>
                  <Select value={facultyYear} onValueChange={setFacultyYear}>
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
                <div className="grid gap-1">
                  <Label>Batch</Label>
                  <Select value={facultyBatch} onValueChange={setFacultyBatch}>
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
              </div>
            )}
            <Button
              onClick={() => {
                if (!email || !password) return
                if (role === "faculty" && !facultyDept) {
                  alert("Please select faculty department.")
                  return
                }
                patchDb((db) => {
                  db.users.push({
                    id: uid("usr"),
                    email,
                    passwordHash: hash(password),
                    role,
                    createdAt: new Date().toISOString(),
                    ...(role === "faculty"
                      ? {
                          facultyScope: {
                            department: facultyDept,
                            year: facultyYear || undefined,
                            batch: facultyBatch || undefined,
                          },
                        }
                      : {}),
                  })
                })
                setEmail("")
                setPassword("")
                setFacultyDept("")
                setFacultyYear("")
                setFacultyBatch("")
                alert("User created.")
              }}
            >
              Create User
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
