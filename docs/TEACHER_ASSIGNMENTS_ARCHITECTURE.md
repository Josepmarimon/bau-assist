# Teacher Assignments Architecture Documentation

## Overview
This document explains how teacher assignments work in the BAU Assist system and critical considerations to avoid breaking the functionality.

## Database Structure

### Tables Involved
1. **`assignments`** - Main table for class assignments
   - Contains `teacher_id` field (can be NULL)
   - This field is automatically synced from `teacher_group_assignments`

2. **`teacher_group_assignments`** - Links teachers to subject groups
   - Contains the actual teacher-subject group relationships
   - Source of truth for which teacher teaches which subject group

3. **`teachers`** - Teacher information
   - Basic teacher data (name, email, etc.)

## How It Works

### Data Flow
```
teacher_group_assignments (source of truth)
    ↓ (via triggers)
assignments.teacher_id (synced copy)
    ↓ (via foreign key)
teachers (teacher details)
```

### Automatic Synchronization
We use database triggers to keep `assignments.teacher_id` in sync:

1. **Insert/Update Trigger**: When a teacher is assigned to a subject group in `teacher_group_assignments`, all related assignments are automatically updated
2. **Delete Trigger**: When a teacher assignment is removed, the teacher is unset from related assignments

## Critical Points - DO NOT BREAK

### 1. NEVER Use the `assignments_with_teachers` View
```typescript
// ❌ WRONG - This causes RLS recursion errors
.from('assignments_with_teachers')
```

The view causes "infinite recursion detected in policy for relation 'user_profiles'" errors due to complex RLS policies.

### 2. ALWAYS Use Direct Table Queries
```typescript
// ✅ CORRECT - Use assignments table with proper joins
const { data: assignmentsData, error } = await supabase
  .from('assignments')
  .select(`
    id,
    teacher_id,
    subjects!subject_id (*),
    teachers!teacher_id (id, first_name, last_name, email)
  `)
```

### 3. Teacher Data Must Be Synced
If teachers aren't showing:
1. Check if `teacher_id` is populated in `assignments` table
2. Run the sync query if needed:
```sql
UPDATE assignments a
SET 
    teacher_id = tga.teacher_id,
    updated_at = NOW()
FROM teacher_group_assignments tga
WHERE 
    a.subject_group_id = tga.subject_group_id 
    AND tga.academic_year = '2025-2026'
    AND a.teacher_id IS NULL;
```

## UI Implementation

### Display Logic
```typescript
// In the assignment display component
{assignment.teacher 
  ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}`
  : "Sense docent assignat"
}
```

### Data Transformation
When loading assignments, ensure the transformation preserves the teacher object:
```typescript
const transformedAssignments = assignmentsData.map(a => ({
  id: a.id,
  subject: a.subjects,
  teacher: a.teachers,  // This comes from the foreign key join
  // ... other fields
}))
```

## Common Issues & Solutions

### Issue 1: RLS Recursion Error
**Symptom**: 500 error with "infinite recursion detected in policy for relation 'user_profiles'"
**Cause**: Using views that join with user_profiles through complex relationships
**Solution**: Use direct table queries instead of views

### Issue 2: Teachers Not Showing
**Symptom**: Teacher shows as "Sense docent assignat" despite being assigned
**Cause**: `teacher_id` not synced from `teacher_group_assignments`
**Solution**: Run the sync query above or check triggers

### Issue 3: Query Returns No Teacher Data
**Symptom**: Teacher object is null even with teacher_id populated
**Cause**: Incorrect query syntax
**Solution**: Use proper Supabase foreign key syntax: `teachers!teacher_id (...)`

## Migration History
- **20250120_update_assignments_with_teachers.sql**: Created triggers to sync teacher assignments
- Triggers ensure automatic synchronization going forward
- Manual sync may be needed for existing data

## Testing Checklist
Before making changes to assignment loading:
1. ✓ Teachers display correctly for existing assignments
2. ✓ New assignments get teachers automatically
3. ✓ No RLS recursion errors occur
4. ✓ Performance is acceptable (no N+1 queries)

## Key Takeaway
The system uses a two-table approach with automatic synchronization. Always query the `assignments` table directly with proper joins, never use complex views that might trigger RLS recursion issues.