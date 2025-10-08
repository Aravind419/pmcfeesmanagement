"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Role } from "@/lib/types"
import { useDb } from "@/lib/local-db"
import { mutate as globalMutate } from "swr"

export default function LoginForm() {
  useDb() // ensure SWR cache warms; response carries currentUser via session
  const [emailOrId, setEmailOrId] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>{role === "student" ? "Register No / Phone" : "Email"}</Label>
        <div className="flex gap-2">
          <Input
            type={role === "student" ? "text" : "email"}
            value={emailOrId}
            onChange={(e) => setEmailOrId(e.target.value)}
            placeholder={role === "student" ? "Enter register no or phone" : "Enter email"}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v: Role) => setRole(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="hod">HOD</SelectItem>
            <SelectItem value="faculty">Faculty</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        disabled={loading}
        onClick={async () => {
          try {
            setError(null)
            setLoading(true)
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ identifier: emailOrId, password, role }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || "Login failed")
            await globalMutate("/api/db")
            window.location.href = "/dashboard"
          } catch (e: any) {
            setError(e?.message ?? "Login failed")
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>
    </div>
  )
}
