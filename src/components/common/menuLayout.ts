export interface MenuAnchor { x: number, y: number, w: number, h: number }

/** Place an anchored menu within the usable window, not within its trigger. */
export const getMenuLayout = (
  anchor: MenuAnchor,
  window: { width: number, height: number },
  content: { width: number, height: number },
  margin: number,
  gap: number,
) => {
  const width = Math.min(content.width, Math.max(0, window.width - margin * 2))
  const maxLeft = Math.max(margin, window.width - margin - width)
  const left = Math.min(maxLeft, Math.max(margin,
    anchor.x + width <= window.width - margin ? anchor.x : anchor.x + anchor.w - width,
  ))
  const below = Math.min(window.height - margin, Math.max(margin, anchor.y + anchor.h + gap))
  const above = Math.min(window.height - margin, Math.max(margin, anchor.y - gap))
  const bottomSpace = Math.max(0, window.height - margin - below)
  const topSpace = Math.max(0, above - margin)
  const opensBelow = content.height <= bottomSpace || bottomSpace >= topSpace

  return {
    width,
    left,
    maxHeight: opensBelow ? bottomSpace : topSpace,
    // Bottom anchoring lets wrapped rows grow upwards without overlapping the trigger.
    ...(opensBelow ? { top: below } : { bottom: window.height - above }),
  }
}
