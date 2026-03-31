# DAI-NSCT — Teacher User Guide

**DAI-NSCT | Department of Artificial Intelligence - National Skills Competency Test**

**Department of Artificial Intelligence**
**The Islamia University of Bahawalpur**

**Portal URL:** https://dai-nsct.vercel.app/

---

## Getting Started

### Logging In

1. Open the DAI-NSCT portal in your browser
2. Enter your IUB email address and password
3. Click **Sign In**

> **First Login:** You will be required to set a new password before accessing the system. Your new password must be at least 8 characters, contain one uppercase letter, and one number.

---

## Your Dashboard

After logging in you will land on your **Dashboard**, which shows:

- **My Sections** — number of sections assigned to you
- **Total Students** — total students across your sections
- **Total Attempts** — total completed exam attempts by your students
- **Avg Score** — average score across all your students

Below the stats, a **Sections Overview** lists each of your assigned sections with student count, attempt count, and average score.

---

## Navigation

The sidebar (or top menu on mobile) gives you access to:

| Menu Item | What it does |
|---|---|
| Dashboard | Your personal overview and section stats |
| Statistics | System-wide statistics (all sections, all students) |
| My Sections | View and manage your assigned sections and students |
| Data Bank | Add, edit, and manage MCQ questions |
| All Teachers | View all department teachers (read-only) |
| All Students | View all enrolled students (read-only) |
| All Sections | View all sections (read-only) |
| All Subjects | View all exam subjects (read-only) |

---

## My Sections

This is your primary working area. It shows all sections assigned to you.

### Viewing Students

1. Click **My Sections** in the sidebar
2. Select a section from the tabs at the top
3. The student list appears, sorted by roll number
4. Click on any student row to expand their attempt history

### Student Attempt Details

Each expanded student row shows a table of their exam attempts:

| Column | Description |
|---|---|
| # | Attempt number (most recent first) |
| Date | Date the exam was taken |
| Score | Percentage score with colour indicator |
| Correct | Correct answers out of total |
| Time | Time taken to complete |
| Status | Completed or Timed Out |

### Changing a Student's Password

If a student forgets their password or is locked out:

1. Find the student in **My Sections**
2. Click the **Password** button on their row
3. Enter a new password (min 8 chars, 1 uppercase, 1 number)
4. Confirm the password and click **Update Password**

> **Note:** You can only reset passwords for students in your own assigned sections. The system enforces this automatically.

---

## Data Bank

You have full access to add, edit, and delete MCQ questions.

### Adding a Question

1. Click **Data Bank** in the sidebar
2. Click **Add Question**
3. Select the subject from the dropdown
4. Type the question text
5. Fill in the answer options (minimum 2, maximum 5)
6. Click **Correct?** on the right answer to mark it
7. Click **Add Question** to save

> The correct answer is stored internally and shuffled randomly for each student during the exam. Students never see the same option order.

### Editing a Question

1. Find the question in the table (use the subject filter to narrow down)
2. Click the **Edit** (pencil) icon
3. Make your changes and click **Update Question**

### Bulk Upload

To upload many questions at once:

1. Click **Bulk Upload**
2. Select the target subject
3. Upload a `.txt` file or paste text in the following format:

```
What is machine learning?
A subset of statistics
correct:A subset of artificial intelligence
A programming language
A database system

Who invented the telephone?
Thomas Edison
correct:Alexander Graham Bell
Nikola Tesla
```

**Rules:**
- First line = question text
- Remaining lines = options (2 to 5)
- Prefix the correct answer with `correct:`
- Leave a blank line between questions

4. Click **Parse & Preview** to check the questions
5. Click **Import** to save them to the data bank

### Deactivating a Question

If a question needs to be temporarily removed from exams without deleting it:

1. Click the **Toggle** icon on the question row
2. The status changes to **Off** — it will be excluded from future exams

---

## Read-Only Views

As a teacher you can browse all data in the system for reference. These views are read-only — you cannot add, edit, or delete from them.

### All Teachers
- View all department faculty with their designation and expertise
- Use the search bar to find a specific teacher

### All Students
- View all enrolled students across all sections
- Filter by section or status
- Sort by roll number, name, or section

### All Sections
- View all sections with assigned teacher and student count
- Sections are sorted by semester and shift

### All Subjects
- View all exam subjects with weightage and question count
- Shows how questions are distributed across subjects in the exam

---

## Statistics

Click **Statistics** in the sidebar to view system-wide performance data:

- Total counts: teachers, students, sections, subjects, questions, attempts
- **Performance by Teacher** table — avg score per teacher's sections
- **Top Students** table — highest performing students across all sections

---

## Tips

- Students are always sorted by roll number following the IUB pattern (year → semester → program → shift → serial)
- Sections are sorted by semester number then shift (e.g. 7th Morning before 7th Evening)
- The exam engine randomly selects questions weighted by subject — adding more questions to a subject increases variety
- Deactivating a question is safer than deleting it — deletion is permanent

---

## Support

For technical issues contact the system administrator.
Developer email: **muzammil.rehman@iub.edu.pk**
