import coursewareManifest from '@/public/courseware/manifest.json'

interface StaticCoursewareFile {
  id: string
  name: string
  url: string
  size?: number
  sha256?: string
}

const files = (coursewareManifest as { files?: StaticCoursewareFile[] }).files || []

const normalizeCoursewareName = (value?: string | null) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const byId = new Map(files.map(file => [file.id, file]))
const byName = new Map(files.map(file => [normalizeCoursewareName(file.name), file]))

export const getStaticCoursewareById = (id?: string | null) =>
  id ? byId.get(id) : undefined

export const getStaticCoursewareByName = (name?: string | null) =>
  name ? byName.get(normalizeCoursewareName(name)) : undefined

export const getStaticCourseware = (id?: string | null, name?: string | null) =>
  getStaticCoursewareById(id) || getStaticCoursewareByName(name)

export const getStaticCoursewareDownloadUrl = (
  id?: string | null,
  name?: string | null,
  disposition: 'inline' | 'attachment' = 'attachment',
) => {
  const file = getStaticCourseware(id, name)
  if (!file)
  { return '' }
  const params = new URLSearchParams({
    disposition,
    filename: name || file.name,
  })
  return `/api/courseware/${encodeURIComponent(file.id)}?${params}`
}
