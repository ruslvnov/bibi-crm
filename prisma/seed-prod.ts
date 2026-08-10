import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.count()
  if (existing > 0) {
    console.log('Users already exist, skipping seed')
    return
  }

  const email = process.env.OWNER_EMAIL || 'owner@example.com'
  const password = process.env.OWNER_PASSWORD || 'ChangeMe123!'

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      name: 'Owner',
      email,
      passwordHash: hash,
      role: UserRole.OWNER,
      isActive: true,
    },
  })

  console.log(`Owner created: ${email}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
