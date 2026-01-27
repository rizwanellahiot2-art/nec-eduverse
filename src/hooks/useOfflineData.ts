// Universal Offline Data Hook
// Provides cached data retrieval for all modules when offline

import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offline-db';

type DataLoader<T> = () => Promise<T>;
type CacheLoader<T> = () => Promise<T>;

interface UseOfflineDataOptions<T> {
  enabled?: boolean;
  initialData?: T;
}

interface UseOfflineDataResult<T> {
  data: T;
  loading: boolean;
  isOffline: boolean;
  isUsingCache: boolean;
  refresh: () => Promise<void>;
}

export function useOfflineData<T>(
  onlineLoader: DataLoader<T>,
  offlineLoader: CacheLoader<T>,
  defaultValue: T,
  options: UseOfflineDataOptions<T> = {}
): UseOfflineDataResult<T> {
  const { enabled = true, initialData } = options;
  const [data, setData] = useState<T>(initialData ?? defaultValue);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isUsingCache, setIsUsingCache] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (navigator.onLine) {
        // Try online first
        const result = await onlineLoader();
        setData(result);
        setIsUsingCache(false);
      } else {
        // Offline - use cache
        const cached = await offlineLoader();
        setData(cached);
        setIsUsingCache(true);
      }
    } catch (error) {
      // If online fetch fails, try cache
      try {
        const cached = await offlineLoader();
        if (cached && (Array.isArray(cached) ? cached.length > 0 : Object.keys(cached as object).length > 0)) {
          setData(cached);
          setIsUsingCache(true);
        }
      } catch {
        // Keep default value
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, onlineLoader, offlineLoader]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reload when coming back online
  useEffect(() => {
    if (!isOffline && enabled) {
      void loadData();
    }
  }, [isOffline, enabled, loadData]);

  return {
    data,
    loading,
    isOffline,
    isUsingCache,
    refresh: loadData,
  };
}

// ==================== Convenience Hooks ====================

export function useOfflineStudents(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedStudent[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name, status, profile_id')
        .eq('school_id', schoolId)
        .order('first_name');
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        firstName: s.first_name,
        lastName: s.last_name,
        status: s.status,
        profileId: s.profile_id,
        classSectionId: '',
        classSectionName: '',
        className: '',
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedStudents(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineClasses(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedAcademicClass[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('academic_classes')
        .select('id, name, grade_level')
        .eq('school_id', schoolId)
        .order('name');
      return (data ?? []).map((c: any) => ({
        id: c.id,
        schoolId,
        name: c.name,
        gradeLevel: c.grade_level,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedAcademicClasses(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineSections(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedClassSection[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('class_sections')
        .select('id, name, class_id, room')
        .eq('school_id', schoolId)
        .order('name');
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        name: s.name,
        classId: s.class_id,
        className: '',
        room: s.room,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedClassSections(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineSubjects(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedSubject[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name');
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        name: s.name,
        code: s.code,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedSubjects(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineFeePlans(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedFeePlan[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('fee_plans')
        .select('id, name, currency, is_active')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((p: any) => ({
        id: p.id,
        schoolId,
        name: p.name,
        currency: p.currency,
        isActive: p.is_active,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedFeePlans(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineInvoices(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedInvoice[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('finance_invoices')
        .select('id, invoice_no, student_id, total, subtotal, status, issue_date, due_date')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((i: any) => ({
        id: i.id,
        schoolId,
        studentId: i.student_id,
        invoiceNo: i.invoice_no,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        total: i.total,
        subtotal: i.subtotal,
        status: i.status,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedInvoices(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflinePayments(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedPayment[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('finance_payments')
        .select('id, invoice_id, student_id, amount, paid_at, reference, method_id')
        .eq('school_id', schoolId)
        .order('paid_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        schoolId,
        studentId: p.student_id,
        invoiceId: p.invoice_id,
        amount: p.amount,
        paidAt: p.paid_at,
        reference: p.reference,
        methodId: p.method_id,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedPayments(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineExpenses(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedExpense[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('finance_expenses')
        .select('id, description, amount, category, expense_date, vendor')
        .eq('school_id', schoolId)
        .order('expense_date', { ascending: false })
        .limit(200);
      return (data ?? []).map((e: any) => ({
        id: e.id,
        schoolId,
        description: e.description,
        amount: e.amount,
        category: e.category,
        expenseDate: e.expense_date,
        vendor: e.vendor,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedExpenses(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflinePaymentMethods(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedPaymentMethod[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('finance_payment_methods')
        .select('id, name, type, is_active')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((m: any) => ({
        id: m.id,
        schoolId,
        name: m.name,
        type: m.type,
        isActive: m.is_active,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedPaymentMethods(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineLeads(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedLead[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('crm_leads')
        .select('id, full_name, email, phone, source, status, stage_id, pipeline_id, score, assigned_to, next_follow_up_at, notes')
        .eq('school_id', schoolId)
        .order('updated_at', { ascending: false });
      return (data ?? []).map((l: any) => ({
        id: l.id,
        schoolId,
        fullName: l.full_name,
        email: l.email,
        phone: l.phone,
        source: l.source,
        status: l.status,
        stageId: l.stage_id,
        pipelineId: l.pipeline_id,
        score: l.score,
        assignedTo: l.assigned_to,
        nextFollowUpAt: l.next_follow_up_at,
        notes: l.notes,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedLeads(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineCrmStages(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedCrmStage[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('crm_stages')
        .select('id, pipeline_id, name, sort_order')
        .eq('school_id', schoolId)
        .order('sort_order', { ascending: true });
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        pipelineId: s.pipeline_id,
        name: s.name,
        sortOrder: s.sort_order,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedCrmStages(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineTimetable(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedTimetableEntry[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('timetable_entries')
        .select('id, day_of_week, period_id, subject_name, teacher_user_id, room, class_section_id, start_time, end_time')
        .eq('school_id', schoolId);
      return (data ?? []).map((e: any) => ({
        id: e.id,
        schoolId,
        dayOfWeek: e.day_of_week,
        periodId: e.period_id,
        periodLabel: '',
        subjectName: e.subject_name,
        classSectionId: e.class_section_id,
        sectionLabel: null,
        room: e.room,
        startTime: e.start_time,
        endTime: e.end_time,
        teacherUserId: e.teacher_user_id,
        sortOrder: 0,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedTimetable(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineTimetablePeriods(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedTimetablePeriod[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('timetable_periods')
        .select('id, label, sort_order, start_time, end_time, is_break')
        .eq('school_id', schoolId)
        .order('sort_order', { ascending: true });
      return (data ?? []).map((p: any) => ({
        id: p.id,
        schoolId,
        label: p.label,
        sortOrder: p.sort_order,
        startTime: p.start_time,
        endTime: p.end_time,
        isBreak: p.is_break,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedTimetablePeriods(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineStaffMembers(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedStaffMember[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('school_user_directory')
        .select('user_id, email, display_name')
        .eq('school_id', schoolId)
        .order('email', { ascending: true });
      return (data ?? []).map((s: any) => ({
        id: s.user_id,
        schoolId,
        userId: s.user_id,
        displayName: s.display_name || s.email,
        email: s.email,
        role: null,
        status: 'active',
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedStaffMembers(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineEnrollments(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedEnrollment[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('student_enrollments')
        .select('id, student_id, class_section_id')
        .eq('school_id', schoolId);
      return (data ?? []).map((e: any) => ({
        id: e.id,
        schoolId,
        studentId: e.student_id,
        classSectionId: e.class_section_id,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedEnrollments(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineTeacherAssignments(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedTeacherAssignment[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('teacher_assignments')
        .select('id, teacher_user_id, class_section_id')
        .eq('school_id', schoolId);
      return (data ?? []).map((a: any) => ({
        id: a.id,
        schoolId,
        teacherUserId: a.teacher_user_id,
        classSectionId: a.class_section_id,
        subjectId: null,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedTeacherAssignments(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineConversations(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedConversation[]> (
    async () => [], // Messages are handled separately
    () => schoolId ? offlineDb.getCachedConversations(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

// ==================== Additional Offline Hooks ====================

export function useOfflineAssignments(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedAssignment[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('assignments')
        .select('id, title, description, due_date, max_marks, status, teacher_user_id, class_section_id')
        .eq('school_id', schoolId)
        .order('due_date', { ascending: false })
        .limit(200);
      return (data ?? []).map((a: any) => ({
        id: a.id,
        schoolId,
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        maxMarks: a.max_marks,
        status: a.status,
        teacherUserId: a.teacher_user_id,
        classSectionId: a.class_section_id,
        sectionLabel: '',
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedAssignments(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineHomework(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedHomework[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('homework')
        .select('id, title, description, due_date, status, teacher_user_id, class_section_id')
        .eq('school_id', schoolId)
        .order('due_date', { ascending: false })
        .limit(200);
      return (data ?? []).map((h: any) => ({
        id: h.id,
        schoolId,
        title: h.title,
        description: h.description,
        dueDate: h.due_date,
        status: h.status,
        teacherUserId: h.teacher_user_id,
        classSectionId: h.class_section_id,
        sectionLabel: '',
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedHomework(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineAttendanceSessions(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedAttendanceSession[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance_sessions')
        .select('id, session_date, period_label, class_section_id')
        .eq('school_id', schoolId)
        .gte('session_date', cutoff)
        .order('session_date', { ascending: false });
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        sessionDate: s.session_date,
        periodLabel: s.period_label,
        classSectionId: s.class_section_id,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedAttendanceSessions(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineAttendanceEntries(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedAttendance[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance_entries')
        .select('id, student_id, session_id, status, note, attendance_sessions!inner(session_date, period_label, class_section_id)')
        .eq('school_id', schoolId)
        .gte('attendance_sessions.session_date', cutoff)
        .limit(1000);
      return (data ?? []).map((e: any) => ({
        id: e.id,
        schoolId,
        studentId: e.student_id,
        sessionId: e.session_id,
        status: e.status,
        note: e.note,
        sessionDate: e.attendance_sessions?.session_date || '',
        periodLabel: e.attendance_sessions?.period_label || '',
        classSectionId: e.attendance_sessions?.class_section_id || '',
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedAttendance(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineLeaveRequests(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedLeaveRequest[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('hr_leave_requests')
        .select('id, user_id, leave_type_id, start_date, end_date, days_count, status, reason')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        schoolId,
        userId: r.user_id,
        leaveTypeId: r.leave_type_id,
        startDate: r.start_date,
        endDate: r.end_date,
        daysCount: r.days_count,
        status: r.status,
        reason: r.reason,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedLeaveRequests(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineContracts(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedContract[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('hr_contracts')
        .select('id, user_id, contract_type, start_date, end_date, position, department, status')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((c: any) => ({
        id: c.id,
        schoolId,
        userId: c.user_id,
        contractType: c.contract_type,
        startDate: c.start_date,
        endDate: c.end_date,
        position: c.position,
        department: c.department,
        status: c.status,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedContracts(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineSalaryRecords(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedSalaryRecord[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('hr_salary_records')
        .select('id, user_id, base_salary, month, year, status')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(200);
      return (data ?? []).map((s: any) => ({
        id: s.id,
        schoolId,
        userId: s.user_id,
        baseSalary: s.base_salary,
        month: s.month,
        year: s.year,
        status: s.status,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedSalaryRecords(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineCampaigns(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedCampaign[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('crm_campaigns')
        .select('id, name, channel, status, budget, start_date, end_date')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((c: any) => ({
        id: c.id,
        schoolId,
        name: c.name,
        channel: c.channel,
        status: c.status,
        budget: c.budget,
        startDate: c.start_date,
        endDate: c.end_date,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedCampaigns(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineNotifications(schoolId: string | null, userId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedNotification[]> (
    async () => {
      if (!schoolId || !userId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('app_notifications')
        .select('id, type, title, body, entity_type, entity_id, read_at, created_at')
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data ?? []).map((n: any) => ({
        id: n.id,
        schoolId,
        userId,
        type: n.type,
        title: n.title,
        body: n.body,
        entityType: n.entity_type,
        entityId: n.entity_id,
        readAt: n.read_at,
        createdAt: n.created_at,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedNotifications(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId && !!userId }
  );
}

export function useOfflineAdminMessages(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedAdminMessage[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('admin_messages')
        .select('id, sender_user_id, subject, content, status, priority, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((m: any) => ({
        id: m.id,
        schoolId,
        senderUserId: m.sender_user_id,
        subject: m.subject,
        content: m.content,
        status: m.status,
        priority: m.priority,
        createdAt: m.created_at,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedAdminMessages(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}

export function useOfflineCrmPipelines(schoolId: string | null, enabled = true) {
  return useOfflineData<offlineDb.CachedCrmPipeline[]> (
    async () => {
      if (!schoolId) return [];
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('crm_pipelines')
        .select('id, name, is_default')
        .eq('school_id', schoolId);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        schoolId,
        name: p.name,
        isDefault: p.is_default,
        cachedAt: Date.now(),
      }));
    },
    () => schoolId ? offlineDb.getCachedCrmPipelines(schoolId) : Promise.resolve([]),
    [],
    { enabled: enabled && !!schoolId }
  );
}
