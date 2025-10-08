"use client"

import Navbar from "@/components/navbar"
import LoginForm from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Role-based access control with six-tier permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
