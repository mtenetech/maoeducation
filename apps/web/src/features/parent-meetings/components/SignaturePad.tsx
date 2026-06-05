import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface SignaturePadProps {
  /** Devuelve la firma como data URL PNG, o null si está vacía. */
  onChange?: (dataUrl: string | null) => void
  className?: string
  height?: number
}

/**
 * Lienzo para capturar una firma/rúbrica con el dedo (táctil) o el mouse.
 * Usa Pointer Events, así un único conjunto de handlers cubre ambos casos.
 */
export function SignaturePad({ onChange, className, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasContent = useRef(false)
  const [empty, setEmpty] = useState(true)

  // Ajusta el tamaño real del canvas al de su contenedor (nitidez en pantallas HiDPI).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#111827'
    }
  }, [])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasContent.current) {
      hasContent.current = true
      setEmpty(false)
    }
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    if (hasContent.current) onChange?.(canvasRef.current?.toDataURL('image/png') ?? null)
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasContent.current = false
    setEmpty(true)
    onChange?.(null)
  }

  return (
    <div className={className}>
      <div className="rounded-md border border-input bg-white">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, touchAction: 'none' }}
          className="block cursor-crosshair rounded-md"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Firma con el dedo (celular) o el mouse.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={empty}>
          <Eraser className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      </div>
    </div>
  )
}
