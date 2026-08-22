import { Section, Text } from "@react-email/components"
import { emailFonts, emailTokens } from "@/lib/email/design-tokens"

export function RouteIllustration() {
  return (
    <Section
      style={{
        margin: "24px 0",
        padding: "16px 18px",
        backgroundColor: emailTokens.parchment,
        border: `1px solid ${emailTokens.borderTan}`,
        borderRadius: "8px",
      }}
    >
      <Text
        style={{
          margin: "0 0 10px",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: emailTokens.forest,
        }}
      >
        De la pantalla al mapa
      </Text>
      <Text
        style={{
          margin: 0,
          fontFamily: emailFonts.display,
          fontSize: "16px",
          lineHeight: "24px",
          color: emailTokens.ink,
        }}
      >
        Ficción → ciudad real → lugares que puedes pisar
      </Text>
      <Text
        style={{
          margin: "8px 0 0",
          fontSize: "13px",
          lineHeight: "20px",
          color: emailTokens.routeLineNavy,
        }}
      >
        Cada pin une una historia con una dirección. Abre el mapa y empieza a recorrerlos.
      </Text>
    </Section>
  )
}
