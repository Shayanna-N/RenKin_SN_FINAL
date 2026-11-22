'use client'

import { useMemo } from 'react'
import QRCode from 'qrcode'
import type { Settings } from '@/lib/types'

type QrShape = Settings['customQrStyle']

const EYE = 7

/** Adds https:// to bare domains so phone cameras open them as links instead of plain text. */
export function normalizeQrUrl(raw: string) {
  const url = raw.trim()
  if (!url) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return `https://${url}`
}

function isEyeModule(r: number, c: number, size: number) {
  const inTop = r < EYE
  const inLeft = c < EYE
  const inRight = c >= size - EYE
  const inBottom = r >= size - EYE
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft)
}

export function StyledQr({
  value,
  shape = 'squares',
  color = 'currentColor',
  background,
  margin = 1,
  title,
  className,
}: {
  value: string
  shape?: QrShape
  color?: string
  background?: string
  margin?: number
  title?: string
  className?: string
}) {
  const matrix = useMemo(() => {
    if (!value) return null
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' })
      return { size: modules.size, get: (r: number, c: number) => modules.get(r, c) }
    } catch {
      return null
    }
  }, [value])

  if (!matrix) return null
  const { size, get } = matrix
  const total = size + margin * 2

  const cells: React.ReactNode[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!get(r, c) || isEyeModule(r, c, size)) continue
      const x = c + margin
      const y = r + margin
      const key = `${r}-${c}`
      if (shape === 'dots') {
        cells.push(<circle key={key} cx={x + 0.5} cy={y + 0.5} r={0.42} />)
      } else if (shape === 'rounded') {
        cells.push(<rect key={key} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.32} />)
      } else {
        cells.push(<rect key={key} x={x} y={y} width={1.02} height={1.02} />)
      }
    }
  }

  const outerRadius = shape === 'squares' ? 0 : shape === 'rounded' ? 1.6 : 2.4
  const innerRadius = shape === 'squares' ? 0 : shape === 'rounded' ? 0.8 : 1.5
  const eyes = [
    [margin, margin],
    [margin + size - EYE, margin],
    [margin, margin + size - EYE],
  ].map(([x, y]) => (
    <g key={`eye-${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={outerRadius} fill="none" stroke={color} strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={innerRadius} />
    </g>
  ))

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      shapeRendering={shape === 'squares' ? 'crispEdges' : 'geometricPrecision'}
    >
      {title && <title>{title}</title>}
      {background && <rect width={total} height={total} fill={background} />}
      <g fill={color}>
        {cells}
        {eyes}
      </g>
    </svg>
  )
}
