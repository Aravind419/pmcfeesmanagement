"use client"

import Navbar from "@/components/navbar"
import RegisterForm from "@/components/auth/register-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useDb } from "@/lib/local-db"

export default function RegisterPage() {
  const db = useDb()
  const open = db.registrationOpen !== false
  const withinWindow = (() => {
    const w = db.registrationWindow
    if (!w) return true
    const now = new Date().getTime()
    const from = w.from ? new Date(w.from).getTime() : Number.NEGATIVE_INFINITY
    const to = w.to ? new Date(w.to).getTime() : Number.POSITIVE_INFINITY
    return now >= from && now <= to
  })()

  const allowed = open && withinWindow

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Registration</CardTitle>
            <CardDescription>Register using your Register Number and academic details.</CardDescription>
          </CardHeader>
          <CardContent>
            {allowed ? <RegisterForm /> : <p>Registration is temporarily closed. Please try later.</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
