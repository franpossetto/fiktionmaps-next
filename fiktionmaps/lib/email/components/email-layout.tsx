import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"
import { getSiteUrl } from "@/lib/site"
import { emailFonts, emailTokens } from "@/lib/email/design-tokens"

type EmailLayoutProps = {
  previewText: string
  children: ReactNode
  unsubscribeUrl?: string | null
}

export function EmailLayout({ previewText, children, unsubscribeUrl }: EmailLayoutProps) {
  // Light logo = white background + black wordmark (used on light UI).
  const logoSrc = `${getSiteUrl()}/logo/fiktion_maps_light_logo.png`

  return (
    <Html lang="es">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "40px 16px",
          backgroundColor: "#f5f5f5",
          fontFamily: emailFonts.body,
          color: emailTokens.charcoal,
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "36px 32px",
          }}
        >
          <Section style={{ textAlign: "center", marginBottom: "28px" }}>
            <Img
              src={logoSrc}
              alt="FiktionMaps"
              width={200}
              height={31}
              style={{
                margin: "0 auto",
                display: "block",
                width: "200px",
                height: "auto",
              }}
            />
          </Section>

          {children}

          <Section style={{ marginTop: "32px", textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#888888",
              }}
            >
              FiktionMaps
            </Text>
            {unsubscribeUrl ? (
              <Text
                style={{
                  margin: "10px 0 0",
                  fontSize: "11px",
                  color: "#888888",
                }}
              >
                <a
                  href={unsubscribeUrl}
                  style={{ color: "#888888", textDecoration: "underline" }}
                >
                  Dejar de recibir este tipo de correo
                </a>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
