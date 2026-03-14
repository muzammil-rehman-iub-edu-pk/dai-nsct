/**
 * db.js — thin wrappers around Supabase that always throw on error.
 *
 * Supabase JS returns { data, error } instead of throwing.
 * Every page was manually checking `if (error) throw error` — or worse,
 * silently ignoring the error. These helpers make errors automatic.
 *
 * Usage:
 *   import { dbSelect, dbInsert, dbUpdate, dbDelete } from '@/lib/db'
 *
 *   const rows  = await dbSelect(supabase.from('teachers').select('*'))
 *   const row   = await dbInsert(supabase.from('teachers').insert(data).select().single())
 *   await dbUpdate(supabase.from('teachers').update(data).eq('id', id))
 *   await dbDelete(supabase.from('teachers').delete().eq('id', id))
 */

/**
 * Awaits a Supabase query builder and throws if there is an error.
 * Returns data directly.
 */
export async function dbQuery(queryBuilder) {
  const { data, error } = await queryBuilder
  if (error) throw new Error(error.message || JSON.stringify(error))
  return data
}

// Named aliases for clarity at call sites
export const dbSelect = dbQuery
export const dbInsert = dbQuery
export const dbUpdate = dbQuery
export const dbDelete = dbQuery
