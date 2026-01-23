

# Parent Panel Implementation Plan

## Overview
Create a read-only parent portal at `/{school}/parent` that allows parents/guardians to view their children's data, receive notifications, and communicate with teachers. The parent role already exists in the `EDUVERSE_ROLES` array.

---

## Current State Analysis

### Existing Infrastructure
- **`student_guardians` table**: Links parents to students with `user_id` (optional, for account access), `student_id`, `full_name`, `relationship`, `phone`, `email`, `is_primary`, `is_emergency_contact`
- **`parent_messages` table**: Existing messaging system between teachers and parents with `sender_user_id`, `recipient_user_id`, `student_id`, `subject`, `content`, `is_read`
- **`parent` role**: Already defined in `eduverse-roles.ts`
- **Teacher messaging module**: `TeacherMessagesModule.tsx` already sends messages to parents with linked user accounts

### What Needs to Be Created
1. **Parent Dashboard route and shell**
2. **Helper function** to find children linked to parent's user account
3. **RLS policies** for parent read access to child data
4. **Notifications table** for attendance alerts and school notices
5. **Consent forms table** (optional, for digital consent workflows)
6. **Parent-specific modules** for viewing child data

---

## Technical Implementation

### Phase 1: Database Schema & Security

**New SQL Helper Functions:**
```text
my_children(_school_id uuid) RETURNS SETOF uuid
  - Returns student IDs where current user is linked via student_guardians.user_id
  
is_my_child(_school_id uuid, _student_id uuid) RETURNS boolean
  - Validates if given student belongs to logged-in parent
```

**New Tables:**
```text
parent_notifications
  - id, school_id, student_id, parent_user_id
  - title, content, notification_type (attendance_alert, fee_reminder, general)
  - is_read, read_at, created_at

consent_forms (optional, for future)
  - id, school_id, student_id, title, description
  - status (pending, signed, declined), signed_by, signed_at
```

**RLS Policy Updates:**
- Add parent read access to: `attendance_entries`, `student_marks`, `timetable_entries`, `finance_invoices`, `student_certificates`, `assignments`, `homework`
- Pattern: `EXISTS (SELECT 1 FROM student_guardians WHERE user_id = auth.uid() AND student_id = <table>.student_id)`

### Phase 2: Frontend Routing & Shell

**Files to Create:**
```text
src/components/tenant/ParentShell.tsx
  - Navigation sidebar with links to: Home, Attendance, Grades, Fees, Messages, Timetable, Support
  
src/pages/tenant/ParentDashboard.tsx
  - Role authorization check for 'parent' role
  - Child selector (if parent has multiple children)
  - Routes to child modules

src/hooks/useMyChildren.ts
  - Hook to fetch children linked to current user via RPC
```

**TenantAuth.tsx Update:**
- Add `parent` role to `roleToPathSegment()` mapping

**App.tsx Update:**
- Add route: `<Route path="/:schoolSlug/parent/*" element={<ParentDashboard />} />`

### Phase 3: Parent Modules (Read-Only)

**Module Files:**
```text
src/pages/tenant/parent-modules/
├── ParentHomeModule.tsx      # Dashboard with child cards, quick stats
├── ParentAttendanceModule.tsx # View attendance + alerts
├── ParentGradesModule.tsx     # View grades and assessments
├── ParentFeesModule.tsx       # View invoices and payment status
├── ParentMessagesModule.tsx   # Read/send messages to teachers
├── ParentTimetableModule.tsx  # View child's timetable
├── ParentNotificationsModule.tsx # View all notifications
└── ParentSupportModule.tsx    # Chat support (reuse support_conversations)
```

### Phase 4: Realtime & Notifications

**Enable Realtime for:**
- `parent_notifications` table
- `parent_messages` table (already exists)

**Notification Triggers (Future Enhancement):**
- Auto-create notification when attendance is marked absent/late
- Auto-create notification when new invoice is issued
- Auto-create notification when new message is received

---

## Data Flow

```text
Parent Login
    │
    ▼
useMyChildren(schoolId)
    │ RPC: my_children(_school_id)
    ▼
Returns: [{ student_id, first_name, last_name, class_section }]
    │
    ▼
Child Selector (if multiple) → Selected Child ID
    │
    ▼
Modules fetch child-specific data with RLS:
  - attendance_entries (student_id = selected)
  - student_marks (student_id = selected)
  - finance_invoices (student_id = selected)
  - etc.
```

---

## Security Model

| Resource | Parent Access | Restriction |
|----------|--------------|-------------|
| Attendance | Read own children | Via `my_children()` check |
| Grades/Marks | Read own children | Via `my_children()` check |
| Fee Invoices | Read own children | Via `my_children()` check |
| Timetable | Read own children | Via enrollment → section check |
| Certificates | Read own children | Via `my_children()` check |
| Messages | Read/Write | Only with teachers of own children |
| Notifications | Read own | Via `parent_user_id = auth.uid()` |
| Students | Read own children only | Cannot modify any student data |
| Academic Data | None | Cannot access grades of other students |
| Finance | None | Cannot access school financials |
| Staff/Users | None | Cannot view staff directory |

---

## File Changes Summary

### New Files (14)
- `src/components/tenant/ParentShell.tsx`
- `src/pages/tenant/ParentDashboard.tsx`
- `src/hooks/useMyChildren.ts`
- `src/pages/tenant/parent-modules/ParentHomeModule.tsx`
- `src/pages/tenant/parent-modules/ParentAttendanceModule.tsx`
- `src/pages/tenant/parent-modules/ParentGradesModule.tsx`
- `src/pages/tenant/parent-modules/ParentFeesModule.tsx`
- `src/pages/tenant/parent-modules/ParentMessagesModule.tsx`
- `src/pages/tenant/parent-modules/ParentTimetableModule.tsx`
- `src/pages/tenant/parent-modules/ParentNotificationsModule.tsx`
- `src/pages/tenant/parent-modules/ParentSupportModule.tsx`
- Supabase migration (helper functions, tables, RLS policies)

### Modified Files (2)
- `src/App.tsx` - Add parent route
- `src/pages/tenant/TenantAuth.tsx` - Add parent path segment mapping

---

## Implementation Order

1. **Database migration** - Helper functions `my_children()`, `is_my_child()`, notifications table, RLS policies
2. **Hook** - `useMyChildren.ts`
3. **Shell** - `ParentShell.tsx` with navigation
4. **Dashboard** - `ParentDashboard.tsx` with routing and authorization
5. **Modules** - All 8 parent modules (read-only views)
6. **Routing** - Update `App.tsx` and `TenantAuth.tsx`
7. **Realtime** - Enable for notifications

---

## Note on Staff-Side Support Module

The second part of your request (adding staff-side Support module to TenantDashboard) was already completed in the previous implementation. The `SupportModule` is now:
- Available at `/{school}/{role}/support`
- Visible to `principal`, `vice_principal`, `super_admin`, `school_owner`, and `hr_manager` roles
- Uses the shared `SupportInbox` component with student-friendly labels

