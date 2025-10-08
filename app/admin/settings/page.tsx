"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

function fileToDataUrl(file?: File): Promise<string | undefined> {
  if (!file) return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const db = useDb()
  const [dept, setDept] = useState("")
  const [reg, setReg] = useState("")
  const [upiId, setUpiId] = useState(db.upiConfig?.upiId || "aravindaravind@ptaxis")
  const [qrFile, setQrFile] = useState<File | undefined>(undefined)
  const [qrPreview, setQrPreview] = useState<string | undefined>(db.upiConfig?.qrDataUrl)

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>Registration window and freeze rules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2 md:grid-cols-3 items-center">
              <div className="flex items-center gap-2">
                <Label>Student Registration Open</Label>
                <Switch
                  checked={!!db.registrationOpen}
                  onCheckedChange={(v) => patchDb((db) => void (db.registrationOpen = v))}
                />
              </div>
              <div className="grid gap-1">
                <Label>From</Label>
                <Input
                  type="datetime-local"
                  value={db.registrationWindow?.from || ""}
                  onChange={(e) =>
                    patchDb((db) => {
                      db.registrationWindow = db.registrationWindow || {}
                      db.registrationWindow.from = e.target.value
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label>To</Label>
                <Input
                  type="datetime-local"
                  value={db.registrationWindow?.to || ""}
                  onChange={(e) =>
                    patchDb((db) => {
                      db.registrationWindow = db.registrationWindow || {}
                      db.registrationWindow.to = e.target.value
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded border p-3 grid gap-2 md:grid-cols-2">
              <div className="grid gap-1">
                <Label>Freeze Department</Label>
                <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Department name" />
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      patchDb((db) => {
                        db.frozenDepartments = db.frozenDepartments || []
                        if (!db.frozenDepartments.includes(dept)) db.frozenDepartments.push(dept)
                      })
                    }
                  >
                    Freeze Dept
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patchDb((db) => {
                        db.frozenDepartments = (db.frozenDepartments || []).filter((d) => d !== dept)
                      })
                    }
                  >
                    Unfreeze Dept
                  </Button>
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Freeze Student (Register No)</Label>
                <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Register No" />
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      patchDb((db) => {
                        db.frozenStudents = db.frozenStudents || []
                        if (!db.frozenStudents.includes(reg)) db.frozenStudents.push(reg)
                      })
                    }
                  >
                    Freeze Student
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      patchDb((db) => {
                        db.frozenStudents = (db.frozenStudents || []).filter((r) => r !== reg)
                      })
                    }
                  >
                    Unfreeze Student
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>UPI / Payment Settings</CardTitle>
            <CardDescription>Configure UPI ID and QR for student payments.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1">
              <Label>UPI ID</Label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="example@upi" />
            </div>
            <div className="grid gap-1">
              <Label>Upload QR Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setQrFile(f)
                  if (f) {
                    const reader = new FileReader()
                    reader.onload = () => setQrPreview(reader.result as string)
                    reader.readAsDataURL(f)
                  } else {
                    setQrPreview(undefined)
                  }
                }}
              />
              {qrPreview ? (
                <img
                  src={qrPreview || "/placeholder.svg"}
                  alt="QR preview"
                  className="h-40 w-40 rounded border object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground">
                  No QR uploaded. Students will see a generated placeholder.
                </div>
              )}
            </div>
            <div>
              <Button
                onClick={async () => {
                  const dataUrl = await fileToDataUrl(qrFile)
                  patchDb((db) => {
                    db.upiConfig = { upiId: upiId.trim(), qrDataUrl: dataUrl || db.upiConfig?.qrDataUrl }
                  })
                  alert("UPI settings saved.")
                }}
              >
                Save UPI Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
