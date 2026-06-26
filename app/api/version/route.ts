import { NextResponse } from 'next/server'
import packageInfo from '@/package.json'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    name: packageInfo.name,
    version: packageInfo.version,
    webVersion: packageInfo.version,
  })
}
