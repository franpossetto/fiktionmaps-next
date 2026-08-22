import { Button } from "@react-email/components"
import { emailTokens } from "@/lib/email/design-tokens"

type CtaButtonProps = {
  href: string
  label: string
  variant?: "primary" | "secondary"
}

export function CtaButton({ href, label, variant = "primary" }: CtaButtonProps) {
  const isPrimary = variant === "primary"
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: isPrimary ? emailTokens.forest : "#ffffff",
        color: isPrimary ? emailTokens.parchmentLight : emailTokens.ink,
        border: isPrimary ? "none" : `1px solid ${emailTokens.borderTan}`,
        fontSize: "15px",
        fontWeight: 600,
        textDecoration: "none",
        padding: "12px 22px",
        borderRadius: "8px",
        marginTop: "8px",
      }}
    >
      {label}
    </Button>
  )
}
