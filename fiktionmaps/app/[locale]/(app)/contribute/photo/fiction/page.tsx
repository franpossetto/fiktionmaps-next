import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { FictionPhotoContributeHub } from "@/components/contribute/photo/fiction-photo-contribute-hub"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeFictionPhotoPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  return <FictionPhotoContributeHub />
}
