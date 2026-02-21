# HackBoats Exam Platform

### For Students

1. Go to the home page (`/`) and log in using Google.
2. Read the instructions on the onboarding screen.
3. Start the exam. The browser will lock you into fullscreen mode.
4. Answer the questions. You can use the sidebar to switch between sections and mark questions for review.
5. **Rules:** Do not switch tabs, exit fullscreen, press screenshot shortcuts (Windows/Command keys), or let the exam window lose focus. Any of these actions will instantly terminate and auto-submit your exam.
6. Submit the exam manually when finished, or wait for the timer to auto-submit.

### For Administrators

Go to `/admin` and log in with your admin password. The dashboard includes the following tabs and features:

**1. Students Tab (Live Monitoring & Results)**
* **Search & Filter:** Search by name, roll no, or email. Filter the list of students by their College.
* **Live Status:** See at a glance if a student is "Not Started", "completed", or "terminated" (caught cheating).
* **View Scores:** Instantly see the student's score, percentage, and completion timestamp.
* **Export Data to Excel:**
  * **All Students:** Download a single sheet containing everyone.
  * **All Colleges (Multi-Sheet):** Download a complete workbook where each college gets its own dedicated Excel tab automatically.
  * **By College:** Export data for a specific college only.
* **Actions:** Use the "Reset" button to clear a student's exam attempt so they can retake it, or use "Delete" to completely wipe their account.

**2. Questions Tab (Bank Management)**
* **Sets:** Create different exam Sets (e.g., Set A, Biology).
* **Sections:** Inside a Set, group questions into Sections (e.g., Chapter 1, Advanced).
* **Questions:** Add, edit, or delete questions with 4 multiple-choice options. Designate exactly one correct option. 

**3. Exam Config Tab**
* Globally change the Exam Duration (time limit in minutes).

**4. Master Data Tab**
* Manage the master lists for dropdowns used during student signup. Add or delete Colleges, and link Departments to those Colleges.

**5. Security Tab**
* Update and change the Admin Dashboard login password securely.

### Features Discussed but Not Yet Implemented

* **Native App Lockdown:** Completely taking over the device (like a custom secure browser lock) to 100% prevent OS-level shortcuts like Circle to Search on Android or Snipping Tool on Windows natively, instead of relying on browser hacks.
* **Complex Question Types:** Adding coding environments, subjective text answers, or rich media (images/videos) to the questions.
* **Automated Proctoring:** Using the webcam and microphone to track eye movement and background noise using AI.
* **Subject Average Widgets:** Advanced analytics showing subject-by-subject performance trends across all users on the admin side.
