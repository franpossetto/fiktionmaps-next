import { Section, Text } from "@react-email/components"
import { CtaButton } from "@/lib/email/components/cta-button"
import { EmailLayout } from "@/lib/email/components/email-layout"
import { emailFonts, emailTokens } from "@/lib/email/design-tokens"

export type WelcomeEmailProps = {
  name: string
  profileHref: string
  mapHref: string
  unsubscribeUrl?: string | null
}

export function WelcomeEmail({
  name,
  profileHref,
  mapHref,
  unsubscribeUrl = null,
}: WelcomeEmailProps) {
  const displayName = name.trim() || "viajero"

  return (
    <EmailLayout
      previewText={`¡Hola ${displayName}! Gracias por unirte a FiktionMaps`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text
        style={{
          margin: "0 0 16px",
          fontFamily: emailFonts.display,
          fontSize: "28px",
          lineHeight: "34px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: emailTokens.ink,
        }}
      >
        ¡Hola {displayName}!
      </Text>

      <Text
        style={{
          margin: "0 0 12px",
          fontSize: "15px",
          lineHeight: "24px",
          color: emailTokens.charcoal,
        }}
      >
        Gracias por unirte a FiktionMaps. Este es un lugar para quienes sienten que las ficciones
        no terminan en la pantalla: viven en calles, plazas y rincones del mundo real.
      </Text>

      <Text
        style={{
          margin: "16px 0 12px",
          fontSize: "15px",
          lineHeight: "24px",
          color: emailTokens.charcoal,
        }}
      >
        Si estás acá es porque amás las buenas historias y explorar lugares nuevos. Va a ser
        genial tenerte aquí: tu mirada y tu curiosidad enriquecen este mapa con cada visita.
      </Text>

      <Section style={{ textAlign: "center", marginTop: "28px" }}>
        <CtaButton href={profileHref} label="Completar tu perfil" />
        <Text
          style={{
            margin: "14px 0 0",
            fontSize: "13px",
            lineHeight: "20px",
            color: "#6b7280",
          }}
        >
          o{" "}
          <a
            href={mapHref}
            style={{
              color: emailTokens.forest,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            explorá el mapa
          </a>
        </Text>
      </Section>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  name: "Francisco",
  profileHref: "https://fiktions.com/es/settings",
  mapHref: "https://fiktions.com/es/map",
  unsubscribeUrl: null,
} satisfies WelcomeEmailProps

export default WelcomeEmail
