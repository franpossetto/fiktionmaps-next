import { Img, Section } from "@react-email/components"

export type StillFanItem = {
  src: string
  alt: string
}

/** Overlapping place photos — cinematic fan / “manojo” (email-safe). */
export function StillFan({ stills }: { stills: StillFanItem[] }) {
  const visible = stills.filter((s) => s.src.trim()).slice(0, 3)
  if (visible.length === 0) return null

  const rotations = [-7, 1.5, 8]
  // Fills ~email content width (~456px): 240 + (240-132)*2 ≈ 456
  const width = 240
  const height = 150
  const overlap = 132

  return (
    <Section style={{ textAlign: "center", margin: "0 0 28px", padding: "4px 0 10px" }}>
      {visible.map((still, index) => {
        const isFirst = index === 0
        const rot = rotations[index] ?? 0
        return (
          <Img
            key={`${still.src}-${index}`}
            src={still.src}
            alt={still.alt}
            width={width}
            height={height}
            style={{
              display: "inline-block",
              width: `${width}px`,
              height: `${height}px`,
              objectFit: "cover",
              borderRadius: "4px",
              border: "none",
              boxShadow: "0 14px 36px rgba(0, 0, 0, 0.5)",
              marginLeft: isFirst ? 0 : `-${overlap}px`,
              position: "relative",
              zIndex: index + 1,
              transform: `rotate(${rot}deg)`,
              verticalAlign: "middle",
            }}
          />
        )
      })}
    </Section>
  )
}
