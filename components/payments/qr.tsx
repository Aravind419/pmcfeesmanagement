"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

export default function QR({ text, imageSrc }: { text: string; imageSrc?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    if (imageSrc && !imgFailed) return
    const canvas = ref.current
    if (!canvas) return
    QRCode.toCanvas(canvas, text, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).catch((err) => {
      console.log("[v0] QR draw error:", err)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#fff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#000"
      ctx.font = "12px sans-serif"
      ctx.fillText("QR unavailable", 50, 110)
    })
  }, [text, imageSrc, imgFailed])

  if (imageSrc && !imgFailed) {
    return (
      <div className="flex flex-col items-center">
        <img
          src={imageSrc || "/placeholder.svg"}
          alt="UPI QR"
          className="h-56 w-56 rounded border object-contain"
          onError={() => setImgFailed(true)}
        />
        <p className="mt-2 text-xs text-muted-foreground">Scan this QR to pay</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <canvas ref={ref} width={220} height={220} className="rounded border bg-white" />
      <p className="mt-2 text-xs text-muted-foreground">Scan this QR to pay</p>
    </div>
  )
}
