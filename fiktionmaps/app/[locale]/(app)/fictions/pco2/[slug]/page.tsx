import { redirect } from "next/navigation"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

/** Legacy URL kept for compatibility; the story view now opens from the fiction page. */
export default async function LegacyFictionStoryRedirect({ params }: Props) {
  const { locale, slug } = await params
  redirect(`/${locale}/fictions/${slug.trim()}`)
}
