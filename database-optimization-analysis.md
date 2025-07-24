# Database Optimization Analysis: Subject Group Counts

## Current Implementation Analysis

### Current Query Pattern
The application currently loads subject group counts in the following way:

1. **Initial Load**: Fetches all subjects with basic information
   ```typescript
   supabase.from('subjects').select('*')
   ```

2. **On-Demand Group Loading**: When a subject is expanded, it loads groups separately
   ```typescript
   supabase.from('subject_groups').select('*').eq('subject_id', subjectId)
   ```

3. **Teacher Counts**: Uses RPC function `get_teacher_names_for_subject`

4. **Assignment Counts**: Queries assignments table separately

### Performance Issues

1. **N+1 Query Problem**: For each expanded subject, multiple queries are executed:
   - Load subject groups
   - Load teacher names via RPC
   - Load assignments for counting
   - Load software requirements

2. **Inefficient Counting**: Group counts are calculated client-side after loading all data

3. **No Aggregate Views**: No database views that pre-compute common aggregates

## Existing Database Resources

### Functions Found
1. **`get_teacher_counts_by_degree`**: Returns teacher counts per group filtered by degree
2. **`get_teacher_names_for_subject`**: Returns concatenated teacher names per group
3. **`get_group_teacher_assignments`**: Returns teacher assignments for a specific group

### Views Found
1. **`teacher_subject_group_assignments`**: Join view for teacher assignments
2. **`assignments_with_teachers`**: Assignments with teacher information

## Optimization Recommendations

### 1. Create Aggregate View for Subject Statistics

Create a materialized view or regular view that pre-computes subject statistics:

```sql
CREATE OR REPLACE VIEW subject_statistics AS
SELECT 
    s.id as subject_id,
    s.code,
    s.name,
    s.credits,
    s.year,
    s.semester,
    s.type,
    s.department,
    s.active,
    s."ID Itinerari" as itinerari,
    COUNT(DISTINCT sg.id) as group_count,
    COUNT(DISTINCT tga.teacher_id) as teacher_count,
    COUNT(DISTINCT a.id) as assignment_count,
    COUNT(DISTINCT ss.software_id) as software_count,
    COALESCE(SUM(sg.max_students), 0) as total_capacity
FROM subjects s
LEFT JOIN subject_groups sg ON s.id = sg.subject_id
LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id
LEFT JOIN assignments a ON sg.id = a.subject_group_id
LEFT JOIN subject_software ss ON s.id = ss.subject_id
GROPE BY s.id;
```

### 2. Create RPC Function for Efficient Subject Loading

Create an RPC function that returns subjects with their counts in a single query:

```sql
CREATE OR REPLACE FUNCTION get_subjects_with_counts(
    p_degree_prefix TEXT DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_semester TEXT DEFAULT NULL,
    p_itinerari TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    credits INT,
    year INT,
    semester VARCHAR,
    type VARCHAR,
    department VARCHAR,
    active BOOLEAN,
    itinerari VARCHAR,
    group_count BIGINT,
    teacher_count BIGINT,
    assignment_count BIGINT,
    total_capacity BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.code,
        s.name,
        s.credits,
        s.year,
        s.semester,
        s.type,
        s.department,
        s.active,
        s."ID Itinerari" as itinerari,
        COUNT(DISTINCT sg.id) as group_count,
        COUNT(DISTINCT tga.teacher_id) as teacher_count,
        COUNT(DISTINCT a.id) as assignment_count,
        COALESCE(SUM(sg.max_students), 0) as total_capacity
    FROM subjects s
    LEFT JOIN subject_groups sg ON s.id = sg.subject_id
    LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id
    LEFT JOIN assignments a ON sg.id = a.subject_group_id
    WHERE 
        (p_degree_prefix IS NULL OR s.code LIKE p_degree_prefix || '%')
        AND (p_year IS NULL OR s.year = p_year)
        AND (p_semester IS NULL OR s.semester = p_semester)
        AND (p_itinerari IS NULL OR s."ID Itinerari" = p_itinerari)
    GROUP BY s.id
    ORDER BY s.code;
$$;
```

### 3. Optimize Group Loading with Aggregated Data

Create a function that loads groups with all necessary counts:

```sql
CREATE OR REPLACE FUNCTION get_subject_groups_with_details(p_subject_id UUID)
RETURNS TABLE (
    id UUID,
    subject_id UUID,
    semester_id UUID,
    group_code VARCHAR,
    max_students INT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    student_group_id UUID,
    semester_name VARCHAR,
    academic_year_name VARCHAR,
    teacher_count BIGINT,
    teacher_names TEXT,
    assignment_count BIGINT,
    enrolled_students BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        sg.id,
        sg.subject_id,
        sg.semester_id,
        sg.group_code,
        sg.max_students,
        sg.created_at,
        sg.updated_at,
        sg.student_group_id,
        sem.name as semester_name,
        ay.name as academic_year_name,
        COUNT(DISTINCT tga.teacher_id) as teacher_count,
        STRING_AGG(DISTINCT CONCAT(t.first_name, ' ', t.last_name), ', ') as teacher_names,
        COUNT(DISTINCT a.id) as assignment_count,
        COUNT(DISTINCT sgs.student_id) as enrolled_students
    FROM subject_groups sg
    LEFT JOIN semesters sem ON sg.semester_id = sem.id
    LEFT JOIN academic_years ay ON sem.academic_year_id = ay.id
    LEFT JOIN teacher_group_assignments tga ON sg.id = tga.subject_group_id
    LEFT JOIN teachers t ON tga.teacher_id = t.id
    LEFT JOIN assignments a ON sg.id = a.subject_group_id
    LEFT JOIN subject_group_students sgs ON sg.id = sgs.subject_group_id
    WHERE sg.subject_id = p_subject_id
    GROUP BY sg.id, sem.name, ay.name
    ORDER BY sg.group_code;
$$;
```

### 4. Create Index Strategy

Add indexes to improve query performance:

```sql
-- Index for subject filtering
CREATE INDEX idx_subjects_code_year_semester ON subjects(code, year, semester);
CREATE INDEX idx_subjects_itinerari ON subjects("ID Itinerari");

-- Index for group counts
CREATE INDEX idx_subject_groups_subject_id ON subject_groups(subject_id);
CREATE INDEX idx_teacher_group_assignments_group_id ON teacher_group_assignments(subject_group_id);
CREATE INDEX idx_assignments_subject_group_id ON assignments(subject_group_id);

-- Composite indexes for common joins
CREATE INDEX idx_subject_groups_composite ON subject_groups(subject_id, semester_id);
```

### 5. Implementation in Frontend

#### Current Implementation
```typescript
// Multiple separate queries
const subjects = await supabase.from('subjects').select('*')
const groups = await supabase.from('subject_groups').select('*').eq('subject_id', id)
const teacherNames = await supabase.rpc('get_teacher_names_for_subject', { p_subject_id: id })
```

#### Optimized Implementation
```typescript
// Single RPC call with all counts
const { data: subjectsWithCounts } = await supabase
  .rpc('get_subjects_with_counts', {
    p_degree_prefix: filters.grau,
    p_year: filters.curs ? parseInt(filters.curs) : null,
    p_semester: filters.semestre,
    p_itinerari: filters.itinerari
  })

// Load groups with details when needed
const { data: groupsWithDetails } = await supabase
  .rpc('get_subject_groups_with_details', {
    p_subject_id: subjectId
  })
```

## Performance Benefits

1. **Reduced Query Count**: From N+1 queries to 1-2 queries per page load
2. **Server-Side Aggregation**: Counts computed in database, not client
3. **Indexed Queries**: Proper indexes for common filter combinations
4. **Cached Results**: Consider materialized views for rarely-changing data

## Migration Strategy

1. Create new database functions and views
2. Add indexes without disrupting existing queries
3. Update frontend code to use new RPC functions
4. Monitor performance improvements
5. Remove old query patterns once stable

## Estimated Performance Improvement

- **Initial Page Load**: 50-70% faster (single query vs multiple)
- **Subject Expansion**: 60-80% faster (pre-computed counts)
- **Filtering**: 40-60% faster (proper indexes)
- **Memory Usage**: Reduced by avoiding large data transfers