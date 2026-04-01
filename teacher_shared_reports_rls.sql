-- Allow teachers to INSERT and SELECT shared_reports for attempts
-- belonging to students in their assigned sections.

DROP POLICY IF EXISTS "shared_reports_teacher" ON shared_reports;
CREATE POLICY "shared_reports_teacher"
  ON shared_reports FOR ALL
  USING (
    attempt_id IN (
      SELECT ea.id FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      JOIN sections sec ON sec.id = s.section_id
      JOIN teachers t ON t.id = sec.teacher_id
      WHERE t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    attempt_id IN (
      SELECT ea.id FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      JOIN sections sec ON sec.id = s.section_id
      JOIN teachers t ON t.id = sec.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );
