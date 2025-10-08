import { NextResponse } from "next/server"

export async function GET() {
  const csv = [
    "roll,name,email,department,year",
    "20230001,Jane Doe,jane@example.com,Computer Science,3",
    "20230002,John Smith,john@example.com,Mathematics,2",
  ].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students-sample.csv"',
    },
  })
}
