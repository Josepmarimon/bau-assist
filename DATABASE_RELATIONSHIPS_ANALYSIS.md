# Database Relationships Analysis

## Overview
This document provides an in-depth analysis of the database structure, focusing on how subjects relate to student groups, semesters, and other entities in the BAU scheduling system.

## Key Tables and Their Structure

### 1. **subjects** Table
The main table for academic subjects with the following key fields:
- `id` (UUID): Primary key
- `code` (VARCHAR): Subject code (e.g., "GDB001")
- `name` (VARCHAR): Subject name
- `year` (INTEGER): Academic year (1, 2, 3, 4)
- `semester` (VARCHAR): Text field indicating when the subject is offered ("1r", "2n", or "1r i 2n")
- `type` (VARCHAR): Subject type (e.g., "obligatoria")
- `credits` (INTEGER): ECTS credits
- `course` (INTEGER): Course number
- `degree` (VARCHAR): Degree program
- `active` (BOOLEAN): Whether the subject is currently active

**Important Note**: The `semester` field in subjects is a text field that indicates when a subject can be offered, not a foreign key to the semesters table.

### 2. **semesters** Table
Represents actual academic semesters:
- `id` (UUID): Primary key
- `academic_year_id` (UUID): Foreign key to academic_years
- `name` (VARCHAR): Semester name (e.g., "Primer Semestre 2025-2026")
- `number` (INTEGER): Semester number
- `start_date` (DATE): Start date
- `end_date` (DATE): End date

### 3. **student_groups** Table
Represents groups of students:
- `id` (UUID): Primary key
- `name` (VARCHAR): Group name (e.g., "GR1-M1")
- `code` (VARCHAR): Group code (matches name)
- `year` (INTEGER): Academic year (1, 2, 3, 4)
- `shift` (VARCHAR): Time shift ("mati" or "tarda")
- `max_students` (INTEGER): Maximum number of students
- `course` (INTEGER): Course number
- `specialization` (VARCHAR): Specialization if applicable

### 4. **subject_groups** Table
Represents different groups/sections for a subject in a specific semester:
- `id` (UUID): Primary key
- `subject_id` (UUID): Foreign key to subjects
- `semester_id` (UUID): Foreign key to semesters
- `group_code` (VARCHAR): Group code (e.g., "GR1-M1")
- `max_students` (INTEGER): Maximum students for this group

### 5. **course_offerings** Table
Represents a subject being offered in a specific academic year and semester:
- `id` (UUID): Primary key
- `academic_year_id` (UUID): Foreign key to academic_years
- `semester_id` (UUID): Foreign key to semesters
- `subject_id` (UUID): Foreign key to subjects
- `coordination_area` (VARCHAR): Coordination area
- `total_ects` (NUMERIC): Total ECTS credits

### 6. **course_group_assignments** Table
Links course offerings to student groups:
- `id` (UUID): Primary key
- `course_offering_id` (UUID): Foreign key to course_offerings
- `student_group_id` (UUID): Foreign key to student_groups
- `teaching_assignment_id` (UUID): Foreign key to teaching_assignments (optional)
- `orientation` (VARCHAR): Orientation/specialization
- `classroom_preference_id` (UUID): Preferred classroom
- `time_slot_preference_id` (UUID): Preferred time slot

### 7. **assignments** Table
(Currently empty) Appears to be designed for specific assignments:
- Links subjects, subject_groups, teachers, classrooms, time_slots, and student_groups
- Has fields for semester_id, hours_per_week, color, notes

### 8. **schedule_slots** Table
(Currently empty) Designed for scheduling:
- Direct link between student_groups and subjects
- Includes day_of_week, start_time, end_time
- Has semester (integer) and academic_year (string) fields

## Relationship Flow

The relationship between subjects and student groups follows this hierarchy:

1. **Subject Definition**: A subject is defined in the `subjects` table with basic information including when it can be offered (semester field).

2. **Course Offering**: When a subject is offered in a specific academic year/semester, a `course_offerings` record is created linking:
   - The subject
   - The academic year
   - The specific semester

3. **Subject Groups**: For each course offering, multiple `subject_groups` are created representing different sections/groups of the same subject in that semester.

4. **Student Group Assignment**: The `course_group_assignments` table links:
   - A course offering
   - A student group
   - Optional teaching assignment
   - Preferences for classroom and time slot

## Key Findings

1. **Semester Relationship**: Subjects have a text field `semester` indicating when they can be offered ("1r", "2n", or "1r i 2n"). The actual semester assignment happens through the `course_offerings` and `subject_groups` tables.

2. **Multiple Levels of Grouping**: 
   - Student groups (e.g., GR1-M1) represent cohorts of students
   - Subject groups represent different sections of a subject
   - The connection happens through course_group_assignments

3. **Empty Tables**: The `assignments` and `schedule_slots` tables are currently empty, suggesting they might be for future use or a different scheduling approach.

4. **Flexibility**: The structure allows for:
   - Subjects to be offered in multiple semesters
   - Multiple groups/sections per subject
   - Different student groups to take the same subject
   - Teacher assignments per course offering

## Example Relationships

Based on the data found:
- Subject "Fonaments del Disseny I" (GDB001) has semester field "1r"
- It has multiple subject groups (GR1-M1, GR1-M2, etc.) for the "Primer Semestre 2025-2026"
- Student groups like "GR1-M1" (first year, morning shift) would be assigned to these subject groups through course_group_assignments

## Conclusion

The database uses a sophisticated multi-table structure to handle the complex relationships between subjects, semesters, and student groups. The key junction tables are `course_offerings` and `course_group_assignments`, which allow flexible assignment of subjects to student groups across different semesters and academic years.