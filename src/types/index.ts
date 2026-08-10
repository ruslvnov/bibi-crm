import type { User, Patient, ConsultationRequest, RequestStatusHistory, WhatsAppMessageLog, Notification } from '@prisma/client'
export type { UserRole, RequestStatus, RequestSource, MessageDirection, MessageStatus } from '@prisma/client'

export type SafeUser = Omit<User, 'passwordHash'>

export type RequestWithRelations = ConsultationRequest & {
  patient: Patient
  assignedAdmin: SafeUser | null
  statusHistory: RequestStatusHistory[]
  messageLogs?: WhatsAppMessageLog[]
}

export type PatientWithRequests = Patient & {
  consultationRequests: ConsultationRequest[]
}

export interface SessionData {
  userId: string
  email: string
  role: string
  name: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RequestFilters {
  status?: string
  source?: string
  service?: string
  district?: string
  adminId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface YCloudMessageResult {
  success: boolean
  ycloudMessageId?: string
  externalId?: string
  errorCode?: string
  errorMessage?: string
  rawResponse?: unknown
}

export interface DashboardStats {
  pending: number
  confirmedToday: number
  rescheduleProposed: number
  cancelled: number
  noShow: number
  total: number
  upcomingToday: RequestWithRelations[]
  recentActivity: RequestStatusHistory[]
}
