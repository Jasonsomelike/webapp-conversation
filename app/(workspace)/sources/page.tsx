import SourcesView from '@/app/components/sources/sources-view'
import { demoReferences } from '@/lib/demo-data'

export default function SourcesPage() {
  return <SourcesView initialReferences={demoReferences} />
}
