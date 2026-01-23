export const EDUVERSE_ROLES = [
  "super_admin",
  "school_owner",
  "principal",
  "vice_principal",
  "academic_coordinator",
  "teacher",
  "accountant",
  "hr_manager",
  "counselor",
  "student",
  "parent",
  "marketing_staff",
] as const;

export type EduverseRole = (typeof EDUVERSE_ROLES)[number];

export const roleLabel: Record<EduverseRole, string> = {
  super_admin: "Super Admin",
  school_owner: "School Owner",
  principal: "Principal",
  vice_principal: "Vice Principal",
  academic_coordinator: "Academic Coordinator",
  teacher: "Teacher",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  counselor: "Counselor",
  student: "Student",
  parent: "Parent",
  marketing_staff: "Marketing",
};

export const isEduverseRole = (value: string | undefined | null): value is EduverseRole => {
  return !!value && (EDUVERSE_ROLES as readonly string[]).includes(value);
};
