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
  CachedStudent,
  CachedTimetableEntry,
  CachedAssignment,
  CachedSubject,
  CachedClassSection,
  CachedAttendance,
  CachedHomework,
} from '@/lib/offline-db';

interface PrefetchOptions {
  schoolId: string | null;
  userId: string | null;
  role: 'teacher' | 'student' | 'parent' | 'principal' | 'staff' | null;
  enabled?: boolean;
}

const PREFETCH_CACHE_KEY = 'eduverse_last_prefetch';
const PREFETCH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

function shouldPrefetch(schoolId: string): boolean {
  try {
    const cached = localStorage.getItem(`${PREFETCH_CACHE_KEY}_${schoolId}`);
    if (!cached) return true;
    const lastPrefetch = parseInt(cached, 10);
    return Date.now() - lastPrefetch > PREFETCH_INTERVAL;
  } catch {
    return true;
  }
}

function markPrefetched(schoolId: string) {
  try {
    localStorage.setItem(`${PREFETCH_CACHE_KEY}_${schoolId}`, Date.now().toString());
  } catch {
    // Ignore
  }
}

export function useDataPrefetch(options: PrefetchOptions) {
  const { schoolId, userId, role, enabled = true } = options;
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !schoolId || !userId || !role) return;
    if (!navigator.onLine) return;
    if (prefetchedRef.current) return;
    if (!shouldPrefetch(schoolId)) return;

    let cancelled = false;
    prefetchedRef.current = true;

    async function prefetchAllData() {
      try {
        console.log('[Prefetch] Starting background data sync for', role);

        const tasks: Promise<void>[] = [];

        // 1. Subjects (all roles)
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
              console.log('[Prefetch] Cached', cached.length, 'subjects');
            }
          })()
        );

        // 2. Class Sections (all roles)
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

        // 3. Teacher/Principal/Staff data
        if (role === 'teacher' || role === 'principal' || role === 'staff') {
          // Teacher assignments and students
          tasks.push(
            (async () => {
              const { data: assignments } = await supabase
                .from('teacher_assignments')
                .select('class_section_id')
                .eq('school_id', schoolId)
                .eq('teacher_user_id', userId);

              if (!cancelled && assignments && assignments.length > 0) {
                const sectionIds = assignments.map((a) => a.class_section_id);
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

          // Timetable
          tasks.push(
            (async () => {
              const { data: entries } = await supabase
                .from('timetable_entries')
                .select(`
                  id, day_of_week, period_id, subject_name, room, 
                  class_section_id, start_time, end_time, school_id,
                  timetable_periods(label, sort_order, start_time, end_time)
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
                  sectionLabel: null,
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

          // Assignments & Homework
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

          // Recent attendance
          tasks.push(
            (async () => {
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
            })()
          );
        }

        // 4. Student data
        if (role === 'student') {
          tasks.push(
            (async () => {
              const { data: studentProfile } = await supabase
                .from('students')
                .select('id, school_id')
                .eq('school_id', schoolId)
                .limit(1)
                .maybeSingle();

              if (!cancelled && studentProfile) {
                const studentId = studentProfile.id;
                const { data: enrollment } = await supabase
                  .from('student_enrollments')
                  .select('class_section_id')
                  .eq('student_id', studentId)
                  .eq('school_id', schoolId)
                  .maybeSingle();

                if (enrollment) {
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
                      startTime: e.start_time || e.timetable_periods?.start_time || null,
                      endTime: e.end_time || e.timetable_periods?.end_time || null,
                      sortOrder: e.timetable_periods?.sort_order || 999,
                      cachedAt: Date.now(),
                    }));
                    await cacheTimetable(cached);
                  }
                }
              }
            })()
          );
        }

        // 5. Parent data
        if (role === 'parent') {
          tasks.push(
            (async () => {
              const { data: guardianships } = await supabase
                .from('student_guardians')
                .select('student_id')
                .eq('user_id', userId);

              if (!cancelled && guardianships && guardianships.length > 0) {
                const studentIds = guardianships.map((g) => g.student_id);
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
                }
              }
            })()
          );
        }

        await Promise.allSettled(tasks);

        if (!cancelled) {
          markPrefetched(schoolId);
          console.log('[Prefetch] Complete! All data cached for offline use.');
        }
      } catch (error) {
        console.error('[Prefetch] Error during background sync:', error);
      }
    }

    void prefetchAllData();

    return () => {
      cancelled = true;
    };
  }, [enabled, schoolId, userId, role]);
}