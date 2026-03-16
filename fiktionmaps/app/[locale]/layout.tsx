import React from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { hasLocale } from "next-intl"
import { notFound } from "next/navigation"
import { ThemeSettingsProvider } from "@/lib/theme-settings-context"
import { AuthProvider } from "@/context/auth-context"
import { ApiProvider } from "@/lib/api/provider"
import { LangSetter } from "@/components/layout/lang-setter"
import { routing } from "@/i18n/routing"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <LangSetter locale={locale} />
      <ThemeSettingsProvider>
        <ApiProvider>
          <AuthProvider>{children}</AuthProvider>
        </ApiProvider>
      </ThemeSettingsProvider>
    </NextIntlClientProvider>
  )
}
