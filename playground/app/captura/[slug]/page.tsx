import { notFound } from 'next/navigation'
import { porSlug, registro } from '../../../lib/registro'
import { Vista } from './Vista'

export const dynamicParams = false
export function generateStaticParams() {
  return registro.map(e => ({ slug: e.slug }))
}

export default async function Captura({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!porSlug(slug)) notFound()
  return <Vista slug={slug} />
}
