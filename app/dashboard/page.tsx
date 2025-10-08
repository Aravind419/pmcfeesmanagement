"use client"

import Navbar from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useDb, currentUser } from "@/lib/local-db"
import type { Role } from "@/lib/types"

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No User</CardTitle>
        <CardDescription>Please login to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login">
          <Button>Login</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function Tile({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-pretty">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button>Open</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function AdminTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="Configure Fees" desc="Activate types and set amounts" href="/fees/configure" />
      <Tile title="Allocate Fees" desc="Assign fees to students" href="/fees/allocate" />
      <Tile title="Approvals" desc="Review payment submissions" href="/admin/approvals" />
      <Tile title="Reports" desc="Collections and outstanding" href="/admin/reports" />
      <Tile title="Users" desc="Create staff accounts" href="/admin/users" />
      <Tile title="Settings" desc="Registration & freeze rules" href="/admin/settings" />
      <Tile title="Students" desc="Lists & filters" href="/admin/students" />
    </div>
  )
}

function OfficeTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="Allocate Fees" desc="Assign fees to students" href="/fees/allocate" />
      <Tile title="Approvals" desc="Review payment submissions" href="/admin/approvals" />
    </div>
  )
}

function PrincipalTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="Approvals (view)" desc="Monitor approvals" href="/admin/approvals" />
      <Tile title="Reports (stub)" desc="Analytics and summaries" href="#" />
    </div>
  )
}

function HODTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="Approvals (view)" desc="Department oversight" href="/admin/approvals" />
      <Tile title="Reports (stub)" desc="Department analytics" href="#" />
    </div>
  )
}

function FacultyTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="Students" desc="View & filter all students" href="/faculty/students" />
    </div>
  )
}

function StudentTiles() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile title="My Profile" desc="Complete personal & family info" href="/students/profile" />
      <Tile title="Pay Fees" desc="View allocations and pay" href="/payments/pay" />
    </div>
  )
}

function byRole(role: Role) {
  switch (role) {
    case "admin":
      return <AdminTiles />
    case "office":
      return <OfficeTiles />
    case "principal":
      return <PrincipalTiles />
    case "hod":
      return <HODTiles />
    case "faculty":
      return <FacultyTiles />
    case "student":
      return <StudentTiles />
  }
}

export default function DashboardPage() {
  const db = useDb()
  const user = currentUser()
  if (!user) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-6xl p-6">
          <EmptyState />
        </section>
      </main>
    )
  }

  const student = user.studentRegNo ? db.students.find((s) => s.registerNo === user.studentRegNo) : undefined
  const nameOrEmail = student?.name || user.email

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-pretty">Welcome, {nameOrEmail}</h1>
          <p className="text-muted-foreground">Role: {user.role.toUpperCase()}</p>
        </div>
        {byRole(user.role)}
      </section>
    </main>
  )
}
