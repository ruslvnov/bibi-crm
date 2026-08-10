import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'Asia/Bishkek'
const CLINIC_ADDRESS = process.env.CLINIC_ADDRESS ?? 'Бишкек, ул. Токомбаева 7/5, Асанбай'

function formatDT(dt: Date): { date: string; time: string } {
  const date = formatInTimeZone(dt, TIMEZONE, 'dd.MM.yyyy')
  const time = formatInTimeZone(dt, TIMEZONE, 'HH:mm')
  return { date, time }
}

export function buildConfirmationMessage(preferredDateTime: Date): string {
  const { date, time } = formatDT(preferredDateTime)
  return (
    `Ваша консультация подтверждена.\n\n` +
    `Дата: ${date}\n` +
    `Время: ${time}\n` +
    `Адрес: ${CLINIC_ADDRESS}.\n\n` +
    `Если ваши планы изменятся, пожалуйста, сообщите нам заранее.`
  )
}

export function buildRescheduleMessage(suggestedDateTime: Date): string {
  const { date, time } = formatDT(suggestedDateTime)
  return (
    `На выбранное вами время запись недоступна.\n\n` +
    `Можем предложить:\n` +
    `${date}\n` +
    `${time}\n\n` +
    `Подходит ли вам это время?`
  )
}

export function buildRejectionMessage(): string {
  return (
    `К сожалению, сейчас мы не можем подтвердить вашу заявку на выбранное время. ` +
    `Администратор свяжется с вами для уточнения.`
  )
}
