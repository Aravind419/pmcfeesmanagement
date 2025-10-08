"use client"

import Navbar from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileForm from "@/components/students/profile-form"

export default function StudentProfilePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Personal info, family details, and documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="parents">Parents</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <ProfileForm section="details" />
              </TabsContent>
              <TabsContent value="certificates">
                <ProfileForm section="certificates" />
              </TabsContent>
              <TabsContent value="parents">
                <ProfileForm section="parents" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
