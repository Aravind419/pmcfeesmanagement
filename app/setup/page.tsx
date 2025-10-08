"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useDb } from "@/lib/local-db"
import { mutate as globalMutate } from "swr"

export default function SetupPage() {
  const db = useDb()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (db.setupComplete && db.users.length > 0) {
    if (typeof window !== "undefined") window.location.href = "/dashboard"
    return null
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>First-time Admin Setup</CardTitle>
            <CardDescription>Create the initial Admin account. No defaults are used.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              className="bg-primary text-primary-foreground"
              disabled={loading || !email || !password}
              onClick={async () => {
                try {
                  setError(null)
                  setLoading(true)
                  const res = await fetch("/api/auth/setup-admin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email, password }),
                  })
                  const body = await res.json().catch(() => ({}))
                  if (!res.ok) throw new Error(body.error || "Admin setup failed")
                  await globalMutate("/api/db")
                  window.location.href = "/dashboard"
                } catch (e: any) {
                  setError(e?.message ?? "Admin setup failed")
                } finally {
                  setLoading(false)
                }
              }}
            >
              {loading ? "Creating..." : "Create Admin"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
