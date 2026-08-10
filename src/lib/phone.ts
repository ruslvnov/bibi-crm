// Normalize phone to E.164 format for Kyrgyzstan (+996)
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')

  // +996XXXXXXXXX (12 digits total)
  if (digits.startsWith('996') && digits.length === 12) {
    return '+' + digits
  }

  // 0XXXXXXXXX (10 digits, local KG format)
  if (digits.startsWith('0') && digits.length === 10) {
    return '+996' + digits.slice(1)
  }

  // 9XXXXXXXXX (9 digits without country code)
  if (!digits.startsWith('996') && digits.length === 9) {
    return '+996' + digits
  }

  // Full number starting with +
  if (phone.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return '+' + digits
  }

  return null
}

export function isValidKgPhone(normalized: string): boolean {
  // Kyrgyzstan: +996 followed by 9 digits
  // Operators: 0700-0709, 0550-0559, 0770-0779, 0995, 0996, 0997, 0880, 0312 (Bishkek landline)
  return /^\+996[0-9]{9}$/.test(normalized)
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return '***'
  return phone.slice(0, 4) + '***' + phone.slice(-3)
}
