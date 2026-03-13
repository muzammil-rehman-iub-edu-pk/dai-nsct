/**
 * validators.js — Form validation helpers.
 * Each validator returns null on success or an error string on failure.
 */

/** Email format check */
export function validateEmail(email) {
  if (!email?.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format.'
  return null
}

/** Password complexity check */
export function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Must contain at least one number.'
  return null
}

/** Required field */
export function required(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required.`
  }
  return null
}

/** Numeric range */
export function validateRange(value, min, max, fieldName = 'Value') {
  const n = parseFloat(value)
  if (isNaN(n)) return `${fieldName} must be a number.`
  if (n < min)  return `${fieldName} must be at least ${min}.`
  if (n > max)  return `${fieldName} must be at most ${max}.`
  return null
}

/** Registration number format (alphanumeric, 3–20 chars) */
export function validateRegNumber(reg) {
  if (!reg?.trim()) return 'Registration number is required.'
  if (!/^[A-Za-z0-9\-\/]+$/.test(reg.trim())) return 'Only letters, numbers, hyphens and slashes allowed.'
  if (reg.trim().length < 3)  return 'Registration number too short (min 3 chars).'
  if (reg.trim().length > 30) return 'Registration number too long (max 30 chars).'
  return null
}

/**
 * Validate a complete teacher form object.
 * Returns an object with field-keyed errors; empty object means valid.
 */
export function validateTeacherForm({ teacher_name, email, password, isNew }) {
  const errors = {}
  const nameErr  = required(teacher_name, 'Teacher name')
  const emailErr = validateEmail(email)
  if (nameErr)  errors.teacher_name = nameErr
  if (emailErr) errors.email = emailErr
  if (isNew) {
    const passErr = validatePassword(password)
    if (passErr) errors.password = passErr
  }
  return errors
}

/**
 * Validate a complete student form object.
 */
export function validateStudentForm({ reg_number, student_name, father_name, section_id, email, password, isNew }) {
  const errors = {}
  const regErr  = validateRegNumber(reg_number)
  const nameErr = required(student_name, 'Student name')
  const dadErr  = required(father_name, 'Father name')
  const secErr  = required(section_id, 'Section')
  const emlErr  = validateEmail(email)
  if (regErr)  errors.reg_number   = regErr
  if (nameErr) errors.student_name = nameErr
  if (dadErr)  errors.father_name  = dadErr
  if (secErr)  errors.section_id   = secErr
  if (emlErr)  errors.email        = emlErr
  if (isNew) {
    const passErr = validatePassword(password)
    if (passErr) errors.password = passErr
  }
  return errors
}

/**
 * Validate a subject form object.
 */
export function validateSubjectForm({ subject_name, weightage }) {
  const errors = {}
  const nameErr  = required(subject_name, 'Subject name')
  const wtErr    = validateRange(weightage, 0.5, 100, 'Weightage')
  if (nameErr) errors.subject_name = nameErr
  if (wtErr)   errors.weightage    = wtErr
  return errors
}
