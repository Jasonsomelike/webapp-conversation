import 'server-only'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const db = globalForPrisma.prisma || new PrismaClient()
globalForPrisma.prisma = db

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL)

const transientDatabaseError = (error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /PrismaClientInitializationError|P1001|P1002|P2024|Can't reach database server|connection.*closed|timed?\s*out|ECONNRESET|ENETUNREACH/i.test(message)
}

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

export const withDatabaseRetry = async <T>(operation: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    }
    catch (error) {
      lastError = error
      if (!transientDatabaseError(error) || attempt === retries)
      { throw error }
      await wait(250 * (attempt + 1) ** 2)
    }
  }
  throw lastError
}
