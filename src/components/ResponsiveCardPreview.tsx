import { useEffect, useRef, useState, type Ref } from 'react'
import {
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
  MembershipCard,
  type MembershipCardMember,
} from './MembershipCard'

const CARD_STACK_PREVIEW_WIDTH = CARD_EXPORT_WIDTH + 32
const CARD_STACK_PREVIEW_HEIGHT = CARD_EXPORT_HEIGHT * 2 + 20 + 32
const MIN_PREVIEW_WIDTH = 280

type ResponsiveCardPreviewProps = {
  member: MembershipCardMember
  photoUrl: string | null
  brandIconUrl: string | null
  leaderImageUrl?: string | null
  qrUrl: string | null
  verifyUrl: string
  cardRef?: Ref<HTMLDivElement>
  frontRef?: Ref<HTMLElement>
  backRef?: Ref<HTMLElement>
  className?: string
}

export function ResponsiveCardPreview({
  member,
  photoUrl,
  brandIconUrl,
  leaderImageUrl,
  qrUrl,
  verifyUrl,
  cardRef,
  frontRef,
  backRef,
  className,
}: ResponsiveCardPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [preview, setPreview] = useState({ scale: 1, offset: 0 })

  useEffect(() => {
    function updatePreview() {
      const viewportWidth = viewportRef.current?.clientWidth ?? window.innerWidth
      const availableWidth = Math.max(MIN_PREVIEW_WIDTH, viewportWidth)
      const nextScale = Math.min(1, availableWidth / CARD_STACK_PREVIEW_WIDTH)
      const nextOffset = Math.max(
        0,
        (availableWidth - CARD_STACK_PREVIEW_WIDTH * nextScale) / 2,
      )

      setPreview({ scale: nextScale, offset: nextOffset })
    }

    updatePreview()

    const observedElement = viewportRef.current
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && observedElement
        ? new ResizeObserver(updatePreview)
        : null

    resizeObserver?.observe(observedElement as Element)
    window.addEventListener('resize', updatePreview)
    window.addEventListener('orientationchange', updatePreview)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePreview)
      window.removeEventListener('orientationchange', updatePreview)
    }
  }, [])

  const scaledHeight = Math.ceil(CARD_STACK_PREVIEW_HEIGHT * preview.scale)

  return (
    <section className={`card-preview-shell ${className ?? ''}`}>
      <div
        ref={viewportRef}
        className="card-preview-viewport"
        style={{ height: scaledHeight }}
      >
        <div
          className="card-preview-scale"
          style={{
            left: preview.offset,
            width: CARD_STACK_PREVIEW_WIDTH,
            transform: `scale(${preview.scale})`,
          }}
        >
          <MembershipCard
            ref={cardRef}
            frontRef={frontRef}
            backRef={backRef}
            member={member}
            photoUrl={photoUrl}
            brandIconUrl={brandIconUrl}
            leaderImageUrl={leaderImageUrl}
            qrUrl={qrUrl}
            verifyUrl={verifyUrl}
          />
        </div>
      </div>
    </section>
  )
}
