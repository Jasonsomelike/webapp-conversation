import 'server-only'

import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { securityQuestions } from '@/lib/account-policy'
import { db, isDatabaseConfigured } from '@/lib/db'
import { ensureAccountLifecycleStorage, isAppUserDeleted } from '@/lib/account-lifecycle'

const usernamePattern = /^[a-zA-Z][a-zA-Z0-9_-]{2,31}$/
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,72}$/

export const credentialsSchema = z.object({
  username: z.string().trim().regex(usernamePattern, '账号需以字母开头，可包含字母、数字、下划线或连字符，长度 3–32 位'),
  password: z.string().min(1, '请输入密码').max(72, '密码不能超过 72 位'),
})

export const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1, '请输入显示名称').max(64, '显示名称不能超过 64 个字符'),
  password: z.string().regex(passwordPattern, '密码至少 8 位，并同时包含字母和数字'),
  securityQuestion: z.string().refine(value => (securityQuestions as readonly string[]).includes(value), '请选择有效的安全问题'),
  securityAnswer: z.string().trim().min(1, '请输入安全问题答案').max(128),
})

export const resetPasswordSchema = credentialsSchema.extend({
  password: z.string().regex(passwordPattern, '密码至少 8 位，并同时包含字母和数字'),
  securityAnswer: z.string().trim().min(1, '请输入安全问题答案').max(128),
})

export const normalizeUsername = (username: string) => username.trim().toLowerCase()
export const normalizeSecurityAnswer = (answer: string) => answer.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, '')

export const deriveAccountDifyUserId = (username: string) =>
  `acct_${createHash('sha256').update(normalizeUsername(username)).digest('hex').slice(0, 32)}`

export const registerUser = async (input: z.infer<typeof registerSchema>) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  await ensureAccountLifecycleStorage()
  const username = normalizeUsername(input.username)
  const existing = await db.appUser.findUnique({ where: { username } })
  if (existing)
  { throw new Error('USERNAME_EXISTS') }

  const [passwordHash, securityAnswerHash] = await Promise.all([
    bcrypt.hash(input.password, 12),
    bcrypt.hash(normalizeSecurityAnswer(input.securityAnswer), 12),
  ])

  return db.appUser.create({
    data: {
      username,
      displayName: input.displayName.trim(),
      passwordHash,
      securityQuestion: input.securityQuestion,
      securityAnswerHash,
      difyUserId: deriveAccountDifyUserId(username),
    },
  })
}

export const authenticateUser = async (usernameInput: string, password: string) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  await ensureAccountLifecycleStorage()
  const username = normalizeUsername(usernameInput)
  const user = await db.appUser.findUnique({ where: { username } })
  if (!user)
  { return null }
  if (await isAppUserDeleted(user.id))
  { return null }

  if (user.lockedUntil && user.lockedUntil > new Date())
  { throw new Error('ACCOUNT_LOCKED') }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1
    await db.appUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failedLoginCount >= 5 ? 0 : failedLoginCount,
        lockedUntil: failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    })
    return null
  }

  return db.appUser.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  })
}

export const getSecurityQuestion = async (usernameInput: string) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  await ensureAccountLifecycleStorage()
  const user = await db.appUser.findUnique({
    where: { username: normalizeUsername(usernameInput) },
    select: { id: true, securityQuestion: true },
  })
  if (!user || await isAppUserDeleted(user.id))
  { return null }
  return { securityQuestion: user.securityQuestion }
}

export const resetUserPassword = async (input: z.infer<typeof resetPasswordSchema>) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  await ensureAccountLifecycleStorage()
  const username = normalizeUsername(input.username)
  const user = await db.appUser.findUnique({ where: { username } })
  if (!user)
  { return false }
  if (await isAppUserDeleted(user.id))
  { return false }

  const validAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(input.securityAnswer),
    user.securityAnswerHash,
  )
  if (!validAnswer)
  { return false }

  const passwordHash = await bcrypt.hash(input.password, 12)
  await db.appUser.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })
  return true
}
