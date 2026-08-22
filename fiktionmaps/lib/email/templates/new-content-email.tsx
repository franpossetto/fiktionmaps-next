import { Img, Section, Text } from "@react-email/components"
import { StillFan } from "@/lib/email/components/still-fan"
import { CtaButton } from "@/lib/email/components/cta-button"
import { EmailLayout } from "@/lib/email/components/email-layout"
import { emailFonts, emailTokens } from "@/lib/email/design-tokens"

export type NewContentPlaceItem = {
  name: string
  fictionTitle: string
  cityName: string
  href: string
  /** Location photo (fan + list thumb). */
  imageUrl?: string | null
}

export type NewContentEmailProps = {
  name: string
  /** City highlighted in the lead copy. Derived from items if omitted. */
  cityName?: string | null
  /** Optional override; if omitted, city-focused default. */
  lead?: string | null
  /** 1–3 places to highlight. */
  items: NewContentPlaceItem[]
  /** Extra places beyond `items` (shown as “y N más”). */
  moreCount?: number
  mapHref: string
  unsubscribeUrl?: string | null
}

function primaryCity(items: NewContentPlaceItem[], cityName?: string | null): string | null {
  const explicit = cityName?.trim()
  if (explicit) return explicit
  const cities = [...new Set(items.map((i) => i.cityName.trim()).filter(Boolean))]
  return cities[0] ?? null
}

function deriveLead(items: NewContentPlaceItem[], cityName?: string | null): string {
  const city = primaryCity(items, cityName)
  if (city) {
    return `Hemos descubierto nuevas locaciones en ${city} que podrían interesarte.`
  }
  return "Hemos descubierto nuevas locaciones que podrían interesarte."
}

function stillFanItems(items: NewContentPlaceItem[]) {
  const seen = new Set<string>()
  const stills: { src: string; alt: string }[] = []
  for (const item of items) {
    const src = item.imageUrl?.trim()
    if (!src || seen.has(src)) continue
    seen.add(src)
    stills.push({ src, alt: item.name })
    if (stills.length >= 3) break
  }
  return stills
}

export function newContentSubject(
  items: NewContentPlaceItem[],
  moreCount = 0,
  cityName?: string | null,
): string {
  const city = primaryCity(items, cityName)
  const total = items.length + Math.max(0, moreCount)
  if (city) {
    return total <= 1 ? `Nueva locación en ${city}` : `Nuevas locaciones en ${city}`
  }
  return total <= 1 ? "Nueva locación en el mapa" : "Nuevas locaciones en el mapa"
}

export function newContentPreviewText(
  items: NewContentPlaceItem[],
  cityName?: string | null,
): string {
  const city = primaryCity(items, cityName)
  if (city) return `Nuevas locaciones en ${city} que podrían interesarte`
  if (items[0]) return `${items[0].name} y más novedades en el mapa`
  return "Hay algo nuevo en FiktionMaps"
}

export function NewContentEmail({
  name,
  cityName = null,
  lead = null,
  items,
  moreCount = 0,
  mapHref,
  unsubscribeUrl = null,
}: NewContentEmailProps) {
  const displayName = name.trim() || "viajero"
  const resolvedLead = (lead?.trim() || deriveLead(items, cityName)).trim()
  const extra = Math.max(0, moreCount)
  const visibleItems = items.slice(0, 3)
  const stills = stillFanItems(visibleItems)
  const city = primaryCity(visibleItems, cityName)

  return (
    <EmailLayout
      previewText={newContentPreviewText(visibleItems, cityName)}
      unsubscribeUrl={unsubscribeUrl}
    >
      {stills.length > 0 ? <StillFan stills={stills} /> : null}

      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: emailTokens.forest,
        }}
      >
        Nuevo en el mapa
      </Text>

      <Text
        style={{
          margin: "0 0 12px",
          fontFamily: emailFonts.display,
          fontSize: "26px",
          lineHeight: "32px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: emailTokens.ink,
        }}
      >
        {city ? `Nuevas locaciones en ${city}` : "Nuevas locaciones"}
      </Text>

      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "15px",
          lineHeight: "24px",
          color: emailTokens.charcoal,
        }}
      >
        Hola {displayName},
      </Text>

      <Text
        style={{
          margin: "0 0 22px",
          fontSize: "15px",
          lineHeight: "24px",
          color: emailTokens.charcoal,
        }}
      >
        {resolvedLead}
      </Text>

      <Section style={{ margin: "0 0 8px" }}>
        {visibleItems.map((item, index) => {
          const thumb = item.imageUrl?.trim() || null
          return (
            <Section
              key={`${item.href}-${index}`}
              style={{
                margin: "0 0 10px",
                padding: "10px 12px",
                backgroundColor: emailTokens.parchmentLight,
                border: `1px solid ${emailTokens.borderTan}`,
                borderRadius: "8px",
              }}
            >
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <tbody>
                  <tr>
                    {thumb ? (
                      <td style={{ width: 96, verticalAlign: "middle", paddingRight: 14 }}>
                        <a href={item.href} style={{ textDecoration: "none" }}>
                          <Img
                            src={thumb}
                            alt={item.name}
                            width={96}
                            height={64}
                            style={{
                              display: "block",
                              width: "96px",
                              height: "64px",
                              objectFit: "cover",
                              borderRadius: "3px",
                              border: "none",
                              boxShadow: "0 3px 10px rgba(0, 0, 0, 0.25)",
                            }}
                          />
                        </a>
                      </td>
                    ) : null}
                    <td style={{ verticalAlign: "middle" }}>
                      <Text
                        style={{
                          margin: "0 0 2px",
                          fontFamily: emailFonts.display,
                          fontSize: "15px",
                          lineHeight: "20px",
                          fontWeight: 700,
                          color: emailTokens.ink,
                        }}
                      >
                        <a
                          href={item.href}
                          style={{ color: emailTokens.ink, textDecoration: "none" }}
                        >
                          {item.name}
                        </a>
                      </Text>
                      <Text
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          lineHeight: "18px",
                          color: emailTokens.mutedNavyText,
                        }}
                      >
                        {item.fictionTitle}
                        {" · "}
                        {item.cityName}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )
        })}
      </Section>

      {extra > 0 ? (
        <Text
          style={{
            margin: "0 0 8px",
            fontSize: "13px",
            lineHeight: "20px",
            color: emailTokens.mutedNavyText,
          }}
        >
          y {extra} más
        </Text>
      ) : null}

      <Section style={{ textAlign: "center", marginTop: "24px" }}>
        <CtaButton href={mapHref} label="Ver en el mapa" />
        <Text
          style={{
            margin: "14px 0 0",
            fontSize: "13px",
            lineHeight: "20px",
            color: "#6b7280",
          }}
        >
          Abrí el mapa y caminá lo que viste en pantalla.
        </Text>
      </Section>
    </EmailLayout>
  )
}

NewContentEmail.PreviewProps = {
  name: "Francisco",
  cityName: "París",
  lead: null,
  items: [
    {
      name: "Café des 2 Moulins",
      fictionTitle: "Amélie",
      cityName: "París",
      href: "https://fiktions.com/es/map?place=demo-1",
      imageUrl:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=720&h=450&fit=crop",
    },
    {
      name: "Sacré-Cœur steps",
      fictionTitle: "Midnight in Paris",
      cityName: "París",
      href: "https://fiktions.com/es/map?place=demo-2",
      imageUrl:
        "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=720&h=450&fit=crop",
    },
    {
      name: "Shakespeare and Company",
      fictionTitle: "Before Sunset",
      cityName: "París",
      href: "https://fiktions.com/es/map?place=demo-3",
      imageUrl:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=720&h=450&fit=crop",
    },
  ],
  moreCount: 2,
  mapHref: "https://fiktions.com/es/map",
  unsubscribeUrl: null,
} satisfies NewContentEmailProps

export default NewContentEmail
