"use client"

import Navbar from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useDb } from "@/lib/local-db"

export default function HomePage() {
  const db = useDb()
  const needsSetup = !db.setupComplete || db.users.length === 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">PMC TECH College Fees Management</CardTitle>
            <CardDescription>Secure payments, student profiles, and admin approvals.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="leading-relaxed">
              Manage fee structures, allocate fees to students, accept payments with QR and UPI ID, and approve
              submissions with a full audit trail. This demo stores data locally in your browser for preview.
            </p>
            {needsSetup ? (
              <Link href="/setup">
                <Button className="w-full">First-time Admin Setup</Button>
              </Link>
            ) : (
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Quick Access</CardTitle>
            <CardDescription>Role-based access with dedicated dashboards.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login">
                <Button variant="secondary">Admin / Office</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Principal / HOD</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Faculty</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Student</Button>
              </Link>
            </div>
            <Link href="/register">
              <Button className="mt-2 w-full bg-accent text-accent-foreground hover:opacity-90">
                Student Registration
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
