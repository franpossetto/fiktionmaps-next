import { PublicTourViewerGuidelines } from "@/components/tours/public-tour-viewer-guidelines"

interface PublicTourGuidelinesPageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicTourGuidelinesPage({ params }: PublicTourGuidelinesPageProps) {
  const { slug } = await params
  return <PublicTourViewerGuidelines slug={slug} />
}
