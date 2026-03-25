-- Add show_results_to_students flag to exam_settings
ALTER TABLE exam_settings ADD COLUMN IF NOT EXISTS show_results_to_students BOOLEAN NOT NULL DEFAULT false;

-- Also allow students to read their own snapshots (needed for review page)
DROP POLICY IF EXISTS "snapshots_read_own" ON exam_question_snapshots;
CREATE POLICY "snapshots_read_own"
  ON exam_question_snapshots FOR SELECT
  TO authenticated
  USING (
    attempt_id IN (
      SELECT ea.id FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE s.user_id = auth.uid()
    )
  );
