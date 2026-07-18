import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PhotoContributeHub } from "@/components/contribute/photo/photo-contribute-hub"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributePhotoPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  return <PhotoContributeHub />
}
