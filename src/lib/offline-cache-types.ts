// Additional cache types for all tenant shells

// ==================== HR/Staff Types ====================

export interface CachedStaffMember {
  id: string;
  schoolId: string;
  userId: string;
  displayName: string;
  email: string | null;
  role: string | null;
  department: string | null;
  status: string;
  cachedAt: number;
}

export interface CachedLeaveRequest {
  id: string;
  schoolId: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: string;
  reason: string | null;
  cachedAt: number;
}

export interface CachedContract {
  id: string;
  schoolId: string;
  userId: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  position: string | null;
  department: string | null;
  status: string;
  cachedAt: number;
}

export interface CachedSalaryRecord {
  id: string;
  schoolId: string;
  userId: string;
  baseSalary: number;
  month: number;
  year: number;
  status: string;
  cachedAt: number;
}

// ==================== Finance Types ====================

export interface CachedInvoice {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  status: string;
  cachedAt: number;
}

export interface CachedPayment {
  id: string;
  schoolId: string;
  studentId: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  reference: string | null;
  cachedAt: number;
}

export interface CachedExpense {
  id: string;
  schoolId: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  vendor: string | null;
  cachedAt: number;
}

export interface CachedFeePlan {
  id: string;
  schoolId: string;
  name: string;
  currency: string;
  isActive: boolean;
  cachedAt: number;
}

// ==================== Marketing/CRM Types ====================

export interface CachedLead {
  id: string;
  schoolId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  stageId: string;
  stageName: string;
  pipelineId: string;
  score: number;
  assignedTo: string | null;
  nextFollowUpAt: string | null;
  cachedAt: number;
}

export interface CachedCampaign {
  id: string;
  schoolId: string;
  name: string;
  channel: string;
  status: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  cachedAt: number;
}

export interface CachedCallLog {
  id: string;
  schoolId: string;
  leadId: string;
  leadName: string;
  calledAt: string;
  durationSeconds: number;
  outcome: string;
  notes: string | null;
  cachedAt: number;
}

// ==================== Academic/Admin Types ====================

export interface CachedAcademicClass {
  id: string;
  schoolId: string;
  name: string;
  gradeLevel: number | null;
  cachedAt: number;
}

export interface CachedTeacherAssignment {
  id: string;
  schoolId: string;
  teacherUserId: string;
  teacherName: string;
  classSectionId: string;
  sectionName: string;
  subjectId: string | null;
  subjectName: string | null;
  cachedAt: number;
}

export interface CachedAssessment {
  id: string;
  schoolId: string;
  title: string;
  classSectionId: string;
  subjectId: string | null;
  subjectName: string | null;
  assessmentDate: string;
  maxMarks: number;
  isPublished: boolean;
  cachedAt: number;
}

export interface CachedStudentMark {
  id: string;
  schoolId: string;
  studentId: string;
  assessmentId: string;
  marks: number | null;
  computedGrade: string | null;
  cachedAt: number;
}

// ==================== Owner/Admin Types ====================

export interface CachedSchoolKPI {
  schoolId: string;
  totalStudents: number;
  totalStaff: number;
  totalTeachers: number;
  totalLeads: number;
  openLeads: number;
  revenueMtd: number;
  pendingInvoices: number;
  attendanceRate7d: number;
  cachedAt: number;
}

export interface CachedSupportTicket {
  id: string;
  schoolId: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  senderName: string;
  cachedAt: number;
}

// ==================== Notification Types ====================

export interface CachedNotification {
  id: string;
  schoolId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  cachedAt: number;
}
