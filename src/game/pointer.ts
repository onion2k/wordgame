import type { PointerEvent as ReactPointerEvent } from 'react'

export const isPointerInCenter = (event: ReactPointerEvent<HTMLSpanElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const insetX = rect.width * 0.2
  const insetY = rect.height * 0.2
  const minX = rect.left + insetX
  const maxX = rect.right - insetX
  const minY = rect.top + insetY
  const maxY = rect.bottom - insetY

  return event.clientX >= minX && event.clientX <= maxX && event.clientY >= minY && event.clientY <= maxY
}
