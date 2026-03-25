-- ============================================================
-- NSCT — Replace Subjects
-- Removes all existing subjects (and their questions via CASCADE)
-- and inserts the 11 subjects from the parsed MCQ databank.
--
-- Weightages are proportional to question count per subject
-- and sum to exactly 100.00.
--
-- WARNING: This will DELETE all existing questions linked to
-- the old subjects (ON DELETE CASCADE on the questions table).
-- Run ONLY on a fresh database or after backing up your data.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Remove all existing subjects
--    CASCADE automatically removes linked rows in:
--      questions → exam_question_snapshots (via question_id)
-- ────────────────────────────────────────────────────────────
DELETE FROM subjects;

-- ────────────────────────────────────────────────────────────
-- 2. Insert subjects from NSCT MCQs Databank
--    Weightage = proportional to question count (sums to 100)
--    Question counts per subject:
--      Database Systems                 1962
--      Computer Networks                 507
--      AI / ML / Data Analytics          500
--      Problem Solving & Analytical      499
--      Web Development                   290
--      Cyber Security                    271
--      Software Engineering              200
--      Java Programming                  163
--      Data Structures & Algorithms      146
--      Operating System                   97
--      Python Programming                 97
--      ─────────────────────────────────────
--      Total                            4732
-- ────────────────────────────────────────────────────────────
INSERT INTO subjects (subject_name, description, weightage, is_active) VALUES
  (
    'Database Systems',
    'DBMS concepts, relational model, SQL, normalization, transactions, ER modeling',
    41.45,
    true
  ),
  (
    'Computer Networks',
    'Network models, protocols, TCP/IP, routing, switching, LAN/WAN, security',
    10.71,
    true
  ),
  (
    'AI / ML / Data Analytics',
    'Artificial intelligence, machine learning algorithms, data analytics, neural networks',
    10.57,
    true
  ),
  (
    'Problem Solving & Analytical Skills',
    'Logical reasoning, analytical thinking, problem decomposition, algorithms',
    10.55,
    true
  ),
  (
    'Web Development',
    'HTML, CSS, JavaScript, DOM, HTTP, REST APIs, responsive design',
    6.13,
    true
  ),
  (
    'Cyber Security',
    'CIA triad, threats, cryptography, firewalls, access control, ethical hacking',
    5.73,
    true
  ),
  (
    'Software Engineering',
    'SDLC models, Agile/Scrum, requirements, design patterns, testing, project management',
    4.23,
    true
  ),
  (
    'Java Programming',
    'OOP concepts, Java syntax, collections, exception handling, multithreading',
    3.44,
    true
  ),
  (
    'Data Structures & Algorithms',
    'Arrays, linked lists, stacks, queues, trees, graphs, sorting, searching, complexity',
    3.09,
    true
  ),
  (
    'Operating System',
    'Process management, scheduling, memory management, file systems, synchronization',
    2.05,
    true
  ),
  (
    'Python Programming',
    'Python syntax, data types, functions, OOP, standard library, scripting',
    2.05,
    true
  );

-- ────────────────────────────────────────────────────────────
-- 3. Verify
-- ────────────────────────────────────────────────────────────
SELECT
  subject_name,
  weightage,
  is_active,
  created_at
FROM subjects
ORDER BY weightage DESC;

SELECT
  'Total subjects: ' || COUNT(*)            AS summary,
  'Total weightage: ' || SUM(weightage)     AS weightage_check
FROM subjects;

COMMIT;
