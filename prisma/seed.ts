import { PrismaClient, UserRole, RequestStatus, RequestSource } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const ownerHash = await bcrypt.hash('ChangeMe123!', 12)
  const adminHash = await bcrypt.hash('ChangeMe123!', 12)

  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      name: 'Владелец клиники',
      email: 'owner@example.com',
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      isActive: true,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Администратор',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      name: 'Наблюдатель',
      email: 'viewer@example.com',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      role: UserRole.VIEWER,
      isActive: true,
    },
  })

  const patient1 = await prisma.patient.upsert({
    where: { normalizedPhone: '+996700111222' },
    update: {},
    create: {
      fullName: 'Айжан Бекова',
      phone: '+996700111222',
      normalizedPhone: '+996700111222',
      whatsappId: '996700111222',
      district: 'Асанбай',
      preferredLanguage: 'ru',
    },
  })

  const patient2 = await prisma.patient.upsert({
    where: { normalizedPhone: '+996555333444' },
    update: {},
    create: {
      fullName: 'Марат Алиев',
      phone: '+996555333444',
      normalizedPhone: '+996555333444',
      district: 'Джал',
      preferredLanguage: 'ru',
    },
  })

  const patient3 = await prisma.patient.upsert({
    where: { normalizedPhone: '+996770555666' },
    update: {},
    create: {
      fullName: 'Гүлнара Сатыбалдиева',
      phone: '+996770555666',
      normalizedPhone: '+996770555666',
      district: 'Кудайберген',
      preferredLanguage: 'ky',
    },
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)
  dayAfter.setHours(14, 0, 0, 0)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(11, 30, 0, 0)

  const req1 = await prisma.consultationRequest.create({
    data: {
      patientId: patient1.id,
      service: 'Имплантация',
      complaint: 'Отсутствуют два нижних зуба',
      missingTeethCount: 2,
      jaw: 'lower',
      missingDuration: 'около 3 лет',
      rootsRemaining: false,
      district: 'Асанбай',
      preferredDate: tomorrow.toISOString().split('T')[0],
      preferredTime: '10:00',
      preferredDateTime: tomorrow,
      status: RequestStatus.PENDING,
      source: RequestSource.YCLOUD_AI,
      externalRequestId: 'test-ext-001',
      ycloudConversationId: 'conv-001',
    },
  })

  await prisma.requestStatusHistory.create({
    data: {
      consultationRequestId: req1.id,
      previousStatus: null,
      newStatus: RequestStatus.PENDING,
      source: 'YCLOUD_AI',
      comment: 'Заявка создана через AI агент',
    },
  })

  const req2 = await prisma.consultationRequest.create({
    data: {
      patientId: patient2.id,
      service: 'All-on-4',
      complaint: 'Хочу восстановить все зубы на нижней челюсти',
      missingTeethCount: 8,
      jaw: 'lower',
      missingDuration: 'более 5 лет',
      rootsRemaining: true,
      district: 'Джал',
      preferredDate: dayAfter.toISOString().split('T')[0],
      preferredTime: '14:00',
      preferredDateTime: dayAfter,
      status: RequestStatus.CONFIRMED,
      source: RequestSource.YCLOUD_AI,
      externalRequestId: 'test-ext-002',
      assignedAdminId: admin.id,
      confirmedAt: new Date(),
    },
  })

  await prisma.requestStatusHistory.createMany({
    data: [
      {
        consultationRequestId: req2.id,
        previousStatus: null,
        newStatus: RequestStatus.PENDING,
        source: 'YCLOUD_AI',
        comment: 'Заявка создана через AI агент',
      },
      {
        consultationRequestId: req2.id,
        previousStatus: RequestStatus.PENDING,
        newStatus: RequestStatus.CONFIRMED,
        changedByUserId: admin.id,
        source: 'ADMIN',
        comment: 'Подтверждена администратором',
      },
    ],
  })

  const req3 = await prisma.consultationRequest.create({
    data: {
      patientId: patient3.id,
      service: 'Имплантация',
      complaint: 'Выпал зуб месяц назад',
      missingTeethCount: 1,
      jaw: 'upper',
      missingDuration: '1 месяц',
      rootsRemaining: false,
      district: 'Кудайберген',
      preferredDate: nextWeek.toISOString().split('T')[0],
      preferredTime: '11:30',
      preferredDateTime: nextWeek,
      status: RequestStatus.RESCHEDULE_PROPOSED,
      source: RequestSource.YCLOUD_AI,
      externalRequestId: 'test-ext-003',
      rescheduleSuggestedDateTime: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
    },
  })

  await prisma.requestStatusHistory.createMany({
    data: [
      {
        consultationRequestId: req3.id,
        previousStatus: null,
        newStatus: RequestStatus.PENDING,
        source: 'YCLOUD_AI',
      },
      {
        consultationRequestId: req3.id,
        previousStatus: RequestStatus.PENDING,
        newStatus: RequestStatus.RESCHEDULE_PROPOSED,
        changedByUserId: admin.id,
        source: 'ADMIN',
        comment: 'Предложено другое время: 13:30',
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: owner.id,
        type: 'NEW_REQUEST',
        title: 'Новая заявка',
        message: `Новая заявка на консультацию от ${patient1.fullName}`,
        entityId: req1.id,
      },
      {
        userId: admin.id,
        type: 'NEW_REQUEST',
        title: 'Новая заявка',
        message: `Новая заявка на консультацию от ${patient1.fullName}`,
        entityId: req1.id,
      },
    ],
  })

  console.log('✅ Seed completed')
  console.log('Accounts:')
  console.log('  OWNER: owner@example.com / ChangeMe123!')
  console.log('  ADMIN: admin@example.com / ChangeMe123!')
  console.log('  VIEWER: viewer@example.com / ChangeMe123!')
  console.log('⚠️  Change all passwords before production!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
