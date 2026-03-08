import { PublicTourViewer } from "@/components/tours/public-tour-viewer"

interface PublicTourPageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicTourPage({ params }: PublicTourPageProps) {
  const { slug } = await params
  return <PublicTourViewer slug={slug} />
}
