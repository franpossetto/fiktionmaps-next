import { Section, Text } from "@react-email/components"
import { emailFonts, emailTokens } from "@/lib/email/design-tokens"

export function PostmarkStamp() {
  return (
    <Section style={{ textAlign: "right", marginBottom: "8px" }}>
      <Text
        style={{
          display: "inline-block",
          margin: 0,
          padding: "8px 12px",
          border: `2px solid ${emailTokens.brass}`,
          borderRadius: "4px",
          color: emailTokens.brass,
          fontFamily: emailFonts.display,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          transform: "rotate(-6deg)",
        }}
      >
        Bienvenida
      </Text>
    </Section>
  )
}
