-- ============================================================
-- Feature: Shareable Public Exam Reports
-- Adds shared_reports table for password-protected public URLs
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id    UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,          -- URL token (UUID-based, URL-safe)
  password_hash TEXT NOT NULL,                 -- bcrypt hash of the 16-char password
  password_plain TEXT NOT NULL,                -- shown once to student (stored for admin recovery)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NULL       -- NULL = never expires
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_shared_reports_token      ON shared_reports(token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_attempt    ON shared_reports(attempt_id);

-- RLS
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Students can insert and read their own shared reports
CREATE POLICY "shared_reports_student_own"
  ON shared_reports FOR ALL
  TO authenticated
  USING (
    attempt_id IN (
      SELECT ea.id FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    attempt_id IN (
      SELECT ea.id FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE s.user_id = auth.uid()
    )
  );

-- Admin can read all
CREATE POLICY "shared_reports_admin"
  ON shared_reports FOR ALL
  USING (get_my_role() = 'admin');

-- Public read by token (unauthenticated access for password verification)
-- We handle this via a public-facing page that queries by token only
-- The actual password check is done client-side after fetching the hash
-- Note: anon role needs SELECT to look up by token
CREATE POLICY "shared_reports_public_read"
  ON shared_reports FOR SELECT
  TO anon
  USING (true);

-- Verify
SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE tablename = 'shared_reports';
