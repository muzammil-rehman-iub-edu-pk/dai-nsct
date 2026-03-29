/**
 * constants.js — Application-wide constants.
 */

export const APP_NAME        = 'NSCT'
export const APP_FULL_NAME   = 'National Skills Competency Test'

// Default admin credentials shown on login page hint
export const DEFAULT_ADMIN_EMAIL    = 'admin@dai-nsct.vercel.app'
export const DEFAULT_ADMIN_PASSWORD = 'Admin@1234'

// User roles
export const ROLES = {
  ADMIN:   'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

// Exam attempt statuses
export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  TIMED_OUT:   'timed_out',
}

// Score grade thresholds
export const GRADES = [
  { min: 80,  label: 'Excellent',    variant: 'success'   },
  { min: 65,  label: 'Good',         variant: 'success'   },
  { min: 50,  label: 'Pass',         variant: 'accent'    },
  { min: 0,   label: 'Fail',         variant: 'danger'    },
]

/**
 * Returns grade info for a given score percentage.
 */
export function getGrade(percent) {
  for (const g of GRADES) {
    if (percent >= g.min) return g
  }
  return GRADES[GRADES.length - 1]
}

// Pagination
export const DEFAULT_PAGE_SIZE = 50

// Timer warning threshold (seconds remaining)
export const TIMER_WARNING_SECS = 300   // 5 minutes

// Bulk upload chunk size for Supabase inserts
export const BULK_INSERT_CHUNK = 100

// Question option labels
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']
