"use client"

import Navbar from "@/components/navbar"
import { useDb, patchDb, uid } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function ConfigureFeesPage() {
  const db = useDb()
  const [newType, setNewType] = useState("")
  const [newName, setNewName] = useState("")
  const [newAmount, setNewAmount] = useState<string>("")

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Fees</CardTitle>
            <CardDescription>Activate fee types, set default amounts, and add custom fee types.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {db.fees.map((f) => (
              <div key={f.id} className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] items-center">
                <div>
                  <Label className="text-base">{f.name}</Label>
                  <p className="text-xs text-muted-foreground">
                    Key: {f.type}
                    {f.isCustom ? " • custom" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${f.id}_active`}>Active</Label>
                  <Switch
                    id={`${f.id}_active`}
                    checked={f.active}
                    onCheckedChange={(v) =>
                      patchDb((db) => {
                        const x = db.fees.find((x) => x.id === f.id)!
                        x.active = v
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    className="w-32"
                    value={f.defaultAmount}
                    onChange={(e) =>
                      patchDb((db) => {
                        const x = db.fees.find((x) => x.id === f.id)!
                        x.defaultAmount = Number(e.target.value || 0)
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-end">
                  {f.isCustom && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        patchDb((db) => {
                          db.fees = db.fees.filter((x) => x.id !== f.id)
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="rounded border p-3">
              <div className="mb-2 font-medium">Add Custom Fee Type</div>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] items-end">
                <div className="grid gap-1">
                  <Label>Type Key (e.g., "hostel")</Label>
                  <Input value={newType} onChange={(e) => setNewType(e.target.value.trim())} />
                </div>
                <div className="grid gap-1">
                  <Label>Display Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label>Default Amount</Label>
                  <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                </div>
                <Button
                  onClick={() => {
                    if (!newType || !newName) return
                    const id = uid("fee")
                    patchDb((db) => {
                      db.fees.push({
                        id,
                        type: newType,
                        name: newName,
                        active: true,
                        defaultAmount: Number(newAmount || 0),
                        isCustom: true,
                      })
                    })
                    setNewType("")
                    setNewName("")
                    setNewAmount("")
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Button onClick={() => alert("Fees saved (locally).")}>Save</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
