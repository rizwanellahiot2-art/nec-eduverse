import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheStudents,
  cacheTimetable,
  cacheAssignments,
  cacheSubjects,
  cacheClassSections,
  cacheAttendance,
  cacheHomework,
  cacheContacts,
  CachedStudent,
  CachedTimetableEntry,
  CachedAssignment,
  CachedSubject,
  CachedClassSection,
  CachedAttendance,
  CachedHomework,
  CachedContact,
} from '@/lib/offline-db';

// Extended role type for prefetching
type PrefetchRole = 
  | 'teacher' 
  | 'student' 
  | 'parent' 
  | 'principal' 
  | 'vice_principal'
  | 'academic_coordinator'
  | 'accountant' 
  | 'hr_manager' 
  | 'marketing_staff'
  | 'counselor'
  | 'school_owner'
  | 'super_admin'
  | 'staff';

interface UniversalPrefetchOptions {
  schoolId: string | null;
  userId: string | null;
  role: PrefetchRole | null;
  enabled?: boolean;
}

const PREFETCH_CACHE_KEY = 'eduverse_universal_prefetch';
const PREFETCH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

function shouldPrefetch(schoolId: string, role: string): boolean {
  try {
    const cached = localStorage.getItem(`${PREFETCH_CACHE_KEY}_${schoolId}_${role}`);
    if (!cached) return true;
    const lastPrefetch = parseInt(cached, 10);
    return Date.now() - lastPrefetch > PREFETCH_INTERVAL;
  } catch {
    return true;
  }
}

function markPrefetched(schoolId: string, role: string) {
  try {
    localStorage.setItem(`${PREFETCH_CACHE_KEY}_${schoolId}_${role}`, Date.now().toString());
  } catch {
    // Ignore
  }
}

// Cache stats and KPIs in localStorage for quick offline access
function cacheStats(schoolId: string, role: string, stats: Record<string, unknown>) {
  try {
    localStorage.setItem(`eduverse_stats_${schoolId}_${role}`, JSON.stringify({
      data: stats,
      cachedAt: Date.now(),
    }));
  } catch {
    // Ignore
  }
}

export function getCachedStats(schoolId: string, role: string): Record<string, unknown> | null {
  try {
    const cached = localStorage.getItem(`eduverse_stats_${schoolId}_${role}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Cache valid for 24 hours
    if (Date.now() - parsed.cachedAt < 24 * 60 * 60 * 1000) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function useUniversalPrefetch(options: UniversalPrefetchOptions) {
  const { schoolId, userId, role, enabled = true } = options;
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !schoolId || !userId || !role) return;
    if (!navigator.onLine) return;
    if (prefetchedRef.current) return;
    if (!shouldPrefetch(schoolId, role)) return;

    let cancelled = false;
    prefetchedRef.current = true;

    async function prefetchAllData() {
      try {
        console.log('[UniversalPrefetch] Starting background sync for', role);

        // Common data for all roles
        await prefetchCommonData(schoolId!, cancelled);

        // Role-specific data
        switch (role) {
          case 'teacher':
            await prefetchTeacherData(schoolId!, userId!, cancelled);
            break;
          case 'student':
            await prefetchStudentData(schoolId!, userId!, cancelled);
            break;
          case 'parent':
            await prefetchParentData(schoolId!, userId!, cancelled);
            break;
          case 'principal':
          case 'vice_principal':
          case 'academic_coordinator':
            await prefetchAdminData(schoolId!, userId!, cancelled);
            break;
          case 'accountant':
            await prefetchAccountantData(schoolId!, cancelled);
            break;
          case 'hr_manager':
            await prefetchHrData(schoolId!, cancelled);
            break;
          case 'marketing_staff':
          case 'counselor':
            await prefetchMarketingData(schoolId!, cancelled);
            break;
          case 'school_owner':
          case 'super_admin':
            await prefetchOwnerData(schoolId!, cancelled);
            break;
          default:
            // Generic staff data
            await prefetchStaffData(schoolId!, userId!, cancelled);
        }

        // Prefetch contacts for messaging
        await prefetchContacts(schoolId!, cancelled);

        if (!cancelled) {
          markPrefetched(schoolId!, role!);
          console.log('[UniversalPrefetch] Complete for', role);
        }
      } catch (error) {
        console.error('[UniversalPrefetch] Error:', error);
      }
    }

    void prefetchAllData();

    return () => {
      cancelled = true;
    };
  }, [enabled, schoolId, userId, role]);
}

// ==================== Common Data ====================

async function prefetchCommonData(schoolId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // Subjects
  tasks.push(
    (async () => {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code, school_id')
        .eq('school_id', schoolId);
      if (!cancelled && subjects) {
        const cached: CachedSubject[] = subjects.map((s) => ({
          id: s.id,
          schoolId: s.school_id,
          name: s.name,
          code: s.code,
          cachedAt: Date.now(),
        }));
        await cacheSubjects(cached);
      }
    })()
  );

  // Class Sections
  tasks.push(
    (async () => {
      const { data: sections } = await supabase
        .from('class_sections')
        .select('id, name, class_id, room, school_id, academic_classes(name)')
        .eq('school_id', schoolId);
      if (!cancelled && sections) {
        const cached: CachedClassSection[] = sections.map((s: any) => ({
          id: s.id,
          schoolId: s.school_id,
          name: s.name,
          classId: s.class_id,
          className: s.academic_classes?.name || '',
          room: s.room,
          cachedAt: Date.now(),
        }));
        await cacheClassSections(cached);
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Teacher Data ====================

async function prefetchTeacherData(schoolId: string, userId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // Teacher's assigned students
  tasks.push(
    (async () => {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_section_id')
        .eq('school_id', schoolId)
        .eq('teacher_user_id', userId);

      if (!cancelled && assignments && assignments.length > 0) {
        const sectionIds = [...new Set(assignments.map((a) => a.class_section_id))];
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select(`
            student_id,
            class_section_id,
            students(id, first_name, last_name, school_id),
            class_sections(id, name, academic_classes(name))
          `)
          .eq('school_id', schoolId)
          .in('class_section_id', sectionIds);

        if (enrollments) {
          const cached: CachedStudent[] = enrollments
            .filter((e: any) => e.students)
            .map((e: any) => ({
              id: e.students.id,
              schoolId: e.students.school_id,
              firstName: e.students.first_name,
              lastName: e.students.last_name,
              classSectionId: e.class_section_id,
              classSectionName: e.class_sections?.name || '',
              className: e.class_sections?.academic_classes?.name || '',
              cachedAt: Date.now(),
            }));
          await cacheStudents(cached);
        }
      }
    })()
  );

  // Teacher's timetable
  tasks.push(
    (async () => {
      const { data: entries } = await supabase
        .from('timetable_entries')
        .select(`
          id, day_of_week, period_id, subject_name, room, 
          class_section_id, start_time, end_time, school_id,
          timetable_periods(label, sort_order, start_time, end_time),
          class_sections(name, academic_classes(name))
        `)
        .eq('school_id', schoolId)
        .eq('teacher_user_id', userId);

      if (!cancelled && entries) {
        const cached: CachedTimetableEntry[] = entries.map((e: any) => ({
          id: e.id,
          schoolId: e.school_id,
          dayOfWeek: e.day_of_week,
          periodId: e.period_id,
          periodLabel: e.timetable_periods?.label || '',
          subjectName: e.subject_name,
          classSectionId: e.class_section_id,
          sectionLabel: e.class_sections
            ? `${e.class_sections.academic_classes?.name || ''} ${e.class_sections.name}`
            : null,
          room: e.room,
          startTime: e.start_time || e.timetable_periods?.start_time || null,
          endTime: e.end_time || e.timetable_periods?.end_time || null,
          sortOrder: e.timetable_periods?.sort_order || 999,
          cachedAt: Date.now(),
        }));
        await cacheTimetable(cached);
      }
    })()
  );

  // Teacher's assignments
  tasks.push(
    (async () => {
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id, title, description, due_date, max_marks, status,
          class_section_id, school_id,
          class_sections(name, academic_classes(name))
        `)
        .eq('school_id', schoolId)
        .eq('teacher_user_id', userId);

      if (!cancelled && assignments) {
        const cached: CachedAssignment[] = assignments.map((a: any) => ({
          id: a.id,
          schoolId: a.school_id,
          title: a.title,
          description: a.description,
          dueDate: a.due_date,
          classSectionId: a.class_section_id,
          sectionLabel: a.class_sections
            ? `${a.class_sections.academic_classes?.name || ''} ${a.class_sections.name}`
            : '',
          maxMarks: a.max_marks,
          status: a.status,
          cachedAt: Date.now(),
        }));
        await cacheAssignments(cached);
      }
    })()
  );

  // Teacher's homework
  tasks.push(
    (async () => {
      const { data: homework } = await supabase
        .from('homework')
        .select(`
          id, title, description, due_date, status,
          class_section_id, school_id,
          class_sections(name, academic_classes(name))
        `)
        .eq('school_id', schoolId)
        .eq('teacher_user_id', userId);

      if (!cancelled && homework) {
        const cached: CachedHomework[] = homework.map((h: any) => ({
          id: h.id,
          schoolId: h.school_id,
          title: h.title,
          description: h.description,
          dueDate: h.due_date,
          status: h.status,
          classSectionId: h.class_section_id,
          sectionLabel: h.class_sections
            ? `${h.class_sections.academic_classes?.name || ''} ${h.class_sections.name}`
            : '',
          cachedAt: Date.now(),
        }));
        await cacheHomework(cached);
      }
    })()
  );

  // Recent attendance (last 30 days)
  tasks.push(prefetchAttendance(schoolId, cancelled));

  // Cache teacher stats
  tasks.push(
    (async () => {
      const [studentsRes, homeworkRes, assignmentsRes] = await Promise.all([
        supabase.from('student_enrollments').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('homework').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('teacher_user_id', userId).eq('status', 'draft'),
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('teacher_user_id', userId),
      ]);
      
      if (!cancelled) {
        cacheStats(schoolId, 'teacher', {
          totalStudents: studentsRes.count ?? 0,
          pendingHomework: homeworkRes.count ?? 0,
          totalAssignments: assignmentsRes.count ?? 0,
        });
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Student Data ====================

async function prefetchStudentData(schoolId: string, userId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // Get student's enrollment and timetable
  tasks.push(
    (async () => {
      // Find student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) return;

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!student) return;

      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('class_section_id')
        .eq('student_id', student.id)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!cancelled && enrollment) {
        // Fetch timetable for student's section
        const { data: entries } = await supabase
          .from('timetable_entries')
          .select(`
            id, day_of_week, period_id, subject_name, room, school_id,
            timetable_periods(label, sort_order, start_time, end_time)
          `)
          .eq('school_id', schoolId)
          .eq('class_section_id', enrollment.class_section_id);

        if (entries) {
          const cached: CachedTimetableEntry[] = entries.map((e: any) => ({
            id: e.id,
            schoolId: e.school_id,
            dayOfWeek: e.day_of_week,
            periodId: e.period_id,
            periodLabel: e.timetable_periods?.label || '',
            subjectName: e.subject_name,
            classSectionId: enrollment.class_section_id,
            sectionLabel: null,
            room: e.room,
            startTime: e.timetable_periods?.start_time || null,
            endTime: e.timetable_periods?.end_time || null,
            sortOrder: e.timetable_periods?.sort_order || 999,
            cachedAt: Date.now(),
          }));
          await cacheTimetable(cached);
        }

        // Fetch student's attendance
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: sessions } = await supabase
          .from('attendance_sessions')
          .select('id, session_date, period_label, class_section_id, school_id')
          .eq('school_id', schoolId)
          .eq('class_section_id', enrollment.class_section_id)
          .gte('session_date', cutoff);

        if (sessions && sessions.length > 0) {
          const { data: attendanceEntries } = await supabase
            .from('attendance_entries')
            .select('id, student_id, session_id, status, note, school_id')
            .eq('school_id', schoolId)
            .eq('student_id', student.id)
            .in('session_id', sessions.map(s => s.id));

          if (attendanceEntries) {
            const sessionMap = new Map(sessions.map((s) => [s.id, s]));
            const cached: CachedAttendance[] = attendanceEntries.map((e) => {
              const session = sessionMap.get(e.session_id);
              return {
                id: e.id,
                schoolId: e.school_id,
                studentId: e.student_id,
                sessionId: e.session_id,
                sessionDate: session?.session_date || '',
                status: e.status,
                note: e.note,
                periodLabel: session?.period_label || '',
                classSectionId: session?.class_section_id || '',
                cachedAt: Date.now(),
              };
            });
            await cacheAttendance(cached);
          }
        }
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Parent Data ====================

async function prefetchParentData(schoolId: string, userId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  tasks.push(
    (async () => {
      const { data: guardianships } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('user_id', userId);

      if (!cancelled && guardianships && guardianships.length > 0) {
        const studentIds = guardianships.map((g) => g.student_id);
        
        // Fetch children's profiles
        const { data: students } = await supabase
          .from('students')
          .select(`
            id, first_name, last_name, school_id,
            student_enrollments(
              class_section_id,
              class_sections(name, academic_classes(name))
            )
          `)
          .eq('school_id', schoolId)
          .in('id', studentIds);

        if (students) {
          const cached: CachedStudent[] = students.map((s: any) => {
            const enrollment = s.student_enrollments?.[0];
            return {
              id: s.id,
              schoolId: s.school_id,
              firstName: s.first_name,
              lastName: s.last_name,
              classSectionId: enrollment?.class_section_id || '',
              classSectionName: enrollment?.class_sections?.name || '',
              className: enrollment?.class_sections?.academic_classes?.name || '',
              cachedAt: Date.now(),
            };
          });
          await cacheStudents(cached);

          // Fetch timetables for all children's sections
          const sectionIds = [...new Set(cached.map(c => c.classSectionId).filter(Boolean))];
          if (sectionIds.length > 0) {
            const { data: entries } = await supabase
              .from('timetable_entries')
              .select(`
                id, day_of_week, period_id, subject_name, room, school_id, class_section_id,
                timetable_periods(label, sort_order, start_time, end_time)
              `)
              .eq('school_id', schoolId)
              .in('class_section_id', sectionIds);

            if (entries) {
              const cachedTimetable: CachedTimetableEntry[] = entries.map((e: any) => ({
                id: e.id,
                schoolId: e.school_id,
                dayOfWeek: e.day_of_week,
                periodId: e.period_id,
                periodLabel: e.timetable_periods?.label || '',
                subjectName: e.subject_name,
                classSectionId: e.class_section_id,
                sectionLabel: null,
                room: e.room,
                startTime: e.timetable_periods?.start_time || null,
                endTime: e.timetable_periods?.end_time || null,
                sortOrder: e.timetable_periods?.sort_order || 999,
                cachedAt: Date.now(),
              }));
              await cacheTimetable(cachedTimetable);
            }
          }

          // Fetch attendance for all children
          const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const { data: attendanceEntries } = await supabase
            .from('attendance_entries')
            .select(`
              id, student_id, session_id, status, note, school_id,
              attendance_sessions(session_date, period_label, class_section_id)
            `)
            .eq('school_id', schoolId)
            .in('student_id', studentIds)
            .gte('created_at', cutoff);

          if (attendanceEntries) {
            const cachedAttendance: CachedAttendance[] = attendanceEntries.map((e: any) => ({
              id: e.id,
              schoolId: e.school_id,
              studentId: e.student_id,
              sessionId: e.session_id,
              sessionDate: e.attendance_sessions?.session_date || '',
              status: e.status,
              note: e.note,
              periodLabel: e.attendance_sessions?.period_label || '',
              classSectionId: e.attendance_sessions?.class_section_id || '',
              cachedAt: Date.now(),
            }));
            await cacheAttendance(cachedAttendance);
          }
        }
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Admin (Principal/VP) Data ====================

async function prefetchAdminData(schoolId: string, userId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // All students
  tasks.push(
    (async () => {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          class_section_id,
          students(id, first_name, last_name, school_id),
          class_sections(id, name, academic_classes(name))
        `)
        .eq('school_id', schoolId)
        .limit(1000);

      if (!cancelled && enrollments) {
        const cached: CachedStudent[] = enrollments
          .filter((e: any) => e.students)
          .map((e: any) => ({
            id: e.students.id,
            schoolId: e.students.school_id,
            firstName: e.students.first_name,
            lastName: e.students.last_name,
            classSectionId: e.class_section_id,
            classSectionName: e.class_sections?.name || '',
            className: e.class_sections?.academic_classes?.name || '',
            cachedAt: Date.now(),
          }));
        await cacheStudents(cached);
      }
    })()
  );

  // All timetable entries
  tasks.push(
    (async () => {
      const { data: entries } = await supabase
        .from('timetable_entries')
        .select(`
          id, day_of_week, period_id, subject_name, room, 
          class_section_id, start_time, end_time, school_id, teacher_user_id,
          timetable_periods(label, sort_order, start_time, end_time),
          class_sections(name, academic_classes(name))
        `)
        .eq('school_id', schoolId)
        .limit(1000);

      if (!cancelled && entries) {
        const cached: CachedTimetableEntry[] = entries.map((e: any) => ({
          id: e.id,
          schoolId: e.school_id,
          dayOfWeek: e.day_of_week,
          periodId: e.period_id,
          periodLabel: e.timetable_periods?.label || '',
          subjectName: e.subject_name,
          classSectionId: e.class_section_id,
          sectionLabel: e.class_sections
            ? `${e.class_sections.academic_classes?.name || ''} ${e.class_sections.name}`
            : null,
          room: e.room,
          startTime: e.start_time || e.timetable_periods?.start_time || null,
          endTime: e.end_time || e.timetable_periods?.end_time || null,
          sortOrder: e.timetable_periods?.sort_order || 999,
          cachedAt: Date.now(),
        }));
        await cacheTimetable(cached);
      }
    })()
  );

  // Attendance data
  tasks.push(prefetchAttendance(schoolId, cancelled));

  // Cache admin stats
  tasks.push(prefetchSchoolKPIs(schoolId, cancelled));

  await Promise.allSettled(tasks);
}

// ==================== Accountant Data ====================

async function prefetchAccountantData(schoolId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // All students for fee tracking
  tasks.push(
    (async () => {
      const { data: students } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, school_id,
          student_enrollments(class_section_id, class_sections(name, academic_classes(name)))
        `)
        .eq('school_id', schoolId)
        .limit(1000);

      if (!cancelled && students) {
        const cached: CachedStudent[] = students.map((s: any) => {
          const enrollment = s.student_enrollments?.[0];
          return {
            id: s.id,
            schoolId: s.school_id,
            firstName: s.first_name,
            lastName: s.last_name,
            classSectionId: enrollment?.class_section_id || '',
            classSectionName: enrollment?.class_sections?.name || '',
            className: enrollment?.class_sections?.academic_classes?.name || '',
            cachedAt: Date.now(),
          };
        });
        await cacheStudents(cached);
      }
    })()
  );

  // Cache finance stats
  tasks.push(
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [paymentsRes, invoicesRes, expensesRes, pendingRes] = await Promise.all([
        supabase.from('finance_payments').select('amount').eq('school_id', schoolId).gte('paid_at', monthStart.toISOString()),
        supabase.from('finance_invoices').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('finance_expenses').select('amount').eq('school_id', schoolId).gte('expense_date', monthStart.toISOString().split('T')[0]),
        supabase.from('finance_invoices').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
      ]);

      if (!cancelled) {
        const revenueMtd = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
        const expensesMtd = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

        cacheStats(schoolId, 'accountant', {
          revenueMtd,
          expensesMtd,
          totalInvoices: invoicesRes.count ?? 0,
          pendingInvoices: pendingRes.count ?? 0,
        });
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== HR Data ====================

async function prefetchHrData(schoolId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // Cache HR stats
  tasks.push(
    (async () => {
      const [staffRes, leavesRes, contractsRes] = await Promise.all([
        supabase.from('school_memberships').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
        supabase.from('hr_contracts').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
      ]);

      if (!cancelled) {
        cacheStats(schoolId, 'hr_manager', {
          totalStaff: staffRes.count ?? 0,
          pendingLeaves: leavesRes.count ?? 0,
          activeContracts: contractsRes.count ?? 0,
        });
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Marketing Data ====================

async function prefetchMarketingData(schoolId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // Cache marketing stats
  tasks.push(
    (async () => {
      const [leadsRes, openRes, campaignsRes, followUpsRes] = await Promise.all([
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'open'),
        supabase.from('crm_campaigns').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).lte('next_follow_up_at', new Date().toISOString()),
      ]);

      if (!cancelled) {
        cacheStats(schoolId, 'marketing_staff', {
          totalLeads: leadsRes.count ?? 0,
          openLeads: openRes.count ?? 0,
          activeCampaigns: campaignsRes.count ?? 0,
          pendingFollowUps: followUpsRes.count ?? 0,
        });
      }
    })()
  );

  await Promise.allSettled(tasks);
}

// ==================== Owner Data ====================

async function prefetchOwnerData(schoolId: string, cancelled: boolean) {
  const tasks: Promise<void>[] = [];

  // All students
  tasks.push(
    (async () => {
      const { data: students } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, school_id,
          student_enrollments(class_section_id, class_sections(name, academic_classes(name)))
        `)
        .eq('school_id', schoolId)
        .limit(1000);

      if (!cancelled && students) {
        const cached: CachedStudent[] = students.map((s: any) => {
          const enrollment = s.student_enrollments?.[0];
          return {
            id: s.id,
            schoolId: s.school_id,
            firstName: s.first_name,
            lastName: s.last_name,
            classSectionId: enrollment?.class_section_id || '',
            classSectionName: enrollment?.class_sections?.name || '',
            className: enrollment?.class_sections?.academic_classes?.name || '',
            cachedAt: Date.now(),
          };
        });
        await cacheStudents(cached);
      }
    })()
  );

  // Cache comprehensive KPIs
  tasks.push(prefetchSchoolKPIs(schoolId, cancelled));

  await Promise.allSettled(tasks);
}

// ==================== Generic Staff Data ====================

async function prefetchStaffData(schoolId: string, userId: string, cancelled: boolean) {
  // Similar to admin data but less comprehensive
  await prefetchAdminData(schoolId, userId, cancelled);
}

// ==================== Utility Functions ====================

async function prefetchAttendance(schoolId: string, cancelled: boolean) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('id, session_date, period_label, class_section_id, school_id')
    .eq('school_id', schoolId)
    .gte('session_date', cutoff);

  if (!cancelled && sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    const { data: entries } = await supabase
      .from('attendance_entries')
      .select('id, student_id, session_id, status, note, school_id')
      .eq('school_id', schoolId)
      .in('session_id', sessionIds);

    if (entries) {
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));
      const cached: CachedAttendance[] = entries.map((e) => {
        const session = sessionMap.get(e.session_id);
        return {
          id: e.id,
          schoolId: e.school_id,
          studentId: e.student_id,
          sessionId: e.session_id,
          sessionDate: session?.session_date || '',
          status: e.status,
          note: e.note,
          periodLabel: session?.period_label || '',
          classSectionId: session?.class_section_id || '',
          cachedAt: Date.now(),
        };
      });
      await cacheAttendance(cached);
    }
  }
}

async function prefetchContacts(schoolId: string, cancelled: boolean) {
  const { data: directory } = await supabase
    .from('school_user_directory')
    .select('user_id, email, display_name')
    .eq('school_id', schoolId)
    .limit(500);

  if (!cancelled && directory) {
    const cached: CachedContact[] = directory.map((d) => ({
      id: d.user_id,
      schoolId,
      userId: d.user_id,
      displayName: d.display_name || d.email || 'Unknown',
      email: d.email,
      role: null,
      canMessage: true,
      cachedAt: Date.now(),
    }));
    await cacheContacts(cached);
  }
}

async function prefetchSchoolKPIs(schoolId: string, cancelled: boolean) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const d7Ago = new Date();
  d7Ago.setDate(d7Ago.getDate() - 7);

  const [
    studentsRes,
    staffRes,
    teachersRes,
    leadsRes,
    openLeadsRes,
    paymentsRes,
    pendingInvoicesRes,
    attendanceRes,
    presentRes,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('school_memberships').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
    supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'open'),
    supabase.from('finance_payments').select('amount').eq('school_id', schoolId).gte('paid_at', monthStart.toISOString()),
    supabase.from('finance_invoices').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
    supabase.from('attendance_entries').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('created_at', d7Ago.toISOString()),
    supabase.from('attendance_entries').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'present').gte('created_at', d7Ago.toISOString()),
  ]);

  if (!cancelled) {
    const revenueMtd = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const totalAttendance = attendanceRes.count ?? 0;
    const presentAttendance = presentRes.count ?? 0;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    const kpis = {
      totalStudents: studentsRes.count ?? 0,
      totalStaff: staffRes.count ?? 0,
      totalTeachers: teachersRes.count ?? 0,
      totalLeads: leadsRes.count ?? 0,
      openLeads: openLeadsRes.count ?? 0,
      revenueMtd,
      pendingInvoices: pendingInvoicesRes.count ?? 0,
      attendanceRate7d: attendanceRate,
    };

    cacheStats(schoolId, 'admin', kpis);
    cacheStats(schoolId, 'principal', kpis);
    cacheStats(schoolId, 'school_owner', kpis);
  }
}
