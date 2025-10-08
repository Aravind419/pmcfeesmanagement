"use client"

import Link from "next/link"
import { useDb, currentUser, logout } from "@/lib/local-db"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const db = useDb()
  const user = currentUser()
  const student = user?.studentRegNo ? db.students.find((s) => s.registerNo === user.studentRegNo) : undefined
  const displayName = student?.name || user?.email

  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2">
          {/* Hide logo square on mobile */}
          <div className="h-8 w-8 rounded bg-primary hidden sm:block" aria-hidden />
          <span className="text-lg font-semibold text-pretty">PMC TECH Fees</span>
        </Link>

        {/* Allow wrapping on small screens */}
        <nav className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <span className="text-sm">
                Welcome, {student?.name ?? displayName} ({user.role})
              </span>
              <Link href="/dashboard">
                <Button variant="default" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await logout()
                  window.location.href = "/"
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary" size="sm">
                  Student Sign Up
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
