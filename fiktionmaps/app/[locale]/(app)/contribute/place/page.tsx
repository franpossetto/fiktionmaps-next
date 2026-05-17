import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getSessionUserId } from "@/lib/auth/auth.service"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributePlacePage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Contribute" })

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <p className="text-center text-sm text-muted-foreground">{t("placeComingSoon")}</p>
    </div>
  )
}
