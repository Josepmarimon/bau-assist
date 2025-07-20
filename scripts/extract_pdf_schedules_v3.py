#!/usr/bin/env python3
"""
Extract schedule data from PDF files for BAU university courses - Version 3.
Improved parser to handle multi-line cells and complete subject names.
"""

import json
import pdfplumber
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ScheduleExtractorV3:
    """Extract schedule information from BAU PDF files - Version 3 with improved parsing."""
    
    def __init__(self, pdf_dir: str = "/Users/josepmarimon/Documents/github/bau-assist/horaris/pdf"):
        self.pdf_dir = Path(pdf_dir)
        self.academic_year = "2025-2026"
        
        # Classroom patterns
        self.classroom_patterns = [
            r'^[PLGM]\s*\d+\.?\d*(?:/[PLGM]\s*\d+\.?\d*)*$',  # P1.6, P0.5/0.7
            r'^[PLGM]\d+\.\d+$',  # P0.2, G1.1
            r'^[PLGM]\.\d+\.\d+$',  # P.0.2, G.1.1  
            r'^Sala\s+Carolines?$',
            r'^Portàtils$',
            r'^PORTATILS$',
            r'^Im\d+\s+[PLGM]\d+\.?\d*$',  # Im1 G0.4
            r'^Pt\.\d+$',  # Pt.2
            r'^Platós.*$',  # Platós+Sala
        ]
        
        # Classroom normalization rules
        self.classroom_normalizations = {
            r'^P(\d)\.(\d+)$': r'P.\1.\2',
            r'^G(\d)\.(\d+)$': r'G.\1.\2',
            r'^L(\d)\.(\d+)$': r'L.\1.\2',
            r'^P(\d)\.(\d)$': r'P.\1.\2',
            r'^G(\d)\.(\d)$': r'G.\1.\2',
            r'^L(\d)\.(\d)$': r'L.\1.\2',
            r'^Pt\.2$': 'P.2.2',
            r'^G\.4$': 'G.0.4',
            r'^Sala\s+Carolines?$': 'SALA_CAROLINES',
            r'^Portàtils$': 'PORTATILS',
            r'^PORTATILS$': 'PORTATILS'
        }
        
    def extract_all_pdfs(self) -> Dict:
        """Extract schedules from all PDFs in the directory."""
        all_schedules = []
        
        pdf_files = sorted(self.pdf_dir.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        for pdf_file in pdf_files:
            logger.info(f"Processing: {pdf_file.name}")
            try:
                schedules = self.extract_single_pdf(pdf_file)
                all_schedules.extend(schedules)
                logger.info(f"  Extracted {len(schedules)} schedules from {pdf_file.name}")
            except Exception as e:
                logger.error(f"Error processing {pdf_file.name}: {str(e)}")
                import traceback
                traceback.print_exc()
                
        result = {
            "academic_year": self.academic_year,
            "extraction_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_schedules": len(all_schedules),
            "schedules": all_schedules
        }
        
        return result
    
    def extract_single_pdf(self, pdf_path: Path) -> List[Dict]:
        """Extract schedules from a single PDF file."""
        schedules = []
        
        # Extract metadata from filename
        degree, course = self._parse_filename(pdf_path.name)
        
        with pdfplumber.open(pdf_path) as pdf:
            all_classes = []
            
            for page_num, page in enumerate(pdf.pages):
                logger.debug(f"Processing page {page_num + 1} of {pdf_path.name}")
                
                # Extract full page text and tables
                page_text = page.extract_text() or ""
                tables = page.extract_tables()
                
                # Detect semester
                semester = self._detect_semester(page_text)
                
                # Extract group info
                group_info = self._extract_group_from_text(page_text, course)
                
                # Process each table with improved extraction
                for table in tables:
                    if self._is_schedule_table(table):
                        classes = self._extract_classes_from_table(
                            table, page_text, degree, course, semester, group_info
                        )
                        all_classes.extend(classes)
            
            # Group classes by student group
            schedules = self._organize_schedules(all_classes, degree, course)
        
        return schedules
    
    def _is_schedule_table(self, table: List[List]) -> bool:
        """Check if a table is a schedule table."""
        if not table or len(table) < 1:
            return False
            
        # Schedule tables typically have 5+ columns (one per day) and contain class info
        if len(table[0]) >= 5:
            # Check if first row contains subject-like content
            first_row_text = ' '.join(str(cell) for cell in table[0] if cell)
            # Look for patterns that indicate class content
            class_indicators = ['Taller', 'Fonaments', 'Disseny', 'Expressió', 'Gràfica', 
                              'Programació', 'Història', 'Cultura', 'Tipografia', 'Projecte']
            return any(indicator in first_row_text for indicator in class_indicators)
        return False
    
    def _extract_classes_from_table(self, table: List[List], page_text: str,
                                   degree: str, course: int, semester: int,
                                   group_info: Dict) -> List[Dict]:
        """Extract classes from a schedule table with improved parsing."""
        classes = []
        
        # Find day columns from page text instead of table
        day_columns = self._find_day_columns_from_text(page_text, table)
        if not day_columns:
            # If not found in text, assume standard 5-day layout
            day_columns = {}
            days = ['DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES']
            num_cols = len(table[0]) if table else 0
            if num_cols >= 5:
                # Distribute columns evenly across days
                cols_per_day = num_cols // 5
                for i, day in enumerate(days):
                    day_columns[day] = i * cols_per_day
        
        # Find time slots
        time_slots = self._extract_time_slots(page_text, table)
        
        # Process each row that might contain classes
        for row_idx in range(len(table)):
            row = table[row_idx]
            
            # Skip if row doesn't have enough cells
            if not row or len(row) < 5:  # At least 5 columns for 5 days
                continue
                
            # Process each day column
            for day_name, col_idx in day_columns.items():
                # Check column and potentially adjacent columns
                for offset in range(2):  # Check current and next column
                    check_idx = col_idx + offset
                    if check_idx >= len(row):
                        continue
                        
                    cell_content = row[check_idx]
                    if not cell_content or str(cell_content).strip() in ['', '-']:
                        continue
                        
                    # Extract class info from cell and surrounding cells
                    class_info = self._extract_class_from_cell(
                        table, row_idx, check_idx, day_name, time_slots, semester
                    )
                    
                    if class_info and not self._is_tutoria(class_info['subject']):
                        # Add group info
                        class_info['group'] = group_info.get('full_name', 'Unknown')
                        class_info['group_code'] = group_info.get('code', 'Unknown')
                        classes.append(class_info)
                        break  # Don't check offset if we found a class
        
        return classes
    
    def _extract_class_from_cell(self, table: List[List], row_idx: int, col_idx: int,
                                day_name: str, time_slots: List[Tuple[str, str]], 
                                semester: int) -> Optional[Dict]:
        """Extract complete class information from a cell and surrounding context."""
        # Get the current cell
        cell_content = str(table[row_idx][col_idx]).strip()
        
        # Initialize variables
        subject_parts = []
        teacher = None
        classroom = None
        
        # Extract from current cell
        lines = cell_content.split('\n')
        
        # Process lines in the cell
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # First 1-2 lines are usually the subject
            if i < 2 and not self._is_classroom(line) and not self._is_teacher_name(line):
                subject_parts.append(line)
            # Check if it's a classroom
            elif self._is_classroom(line):
                classroom = line
            # Check if it looks like a teacher name
            elif self._is_teacher_name(line) and not teacher:
                teacher = line
            # Handle special cases like "Gràfica I/II" which are part of subject
            elif line in ['Gràfica I', 'Gràfica II', 'I', 'II'] and 'Expressió' in ' '.join(subject_parts):
                subject_parts.append(line)
        
        # Check cells below for classroom (common pattern in these PDFs)
        if not classroom:
            for offset in range(1, min(3, len(table) - row_idx)):
                if row_idx + offset < len(table) and col_idx < len(table[row_idx + offset]):
                    below_cell = table[row_idx + offset][col_idx]
                    if below_cell:
                        below_text = str(below_cell).strip()
                        # Check if entire cell is a classroom
                        if self._is_classroom(below_text) and len(below_text) < 20:
                            classroom = below_text
                            break
                        # Check lines within cell
                        for line in below_text.split('\n'):
                            line = line.strip()
                            if self._is_classroom(line) and len(line) < 20:
                                classroom = line
                                break
        
        # Also check cells in adjacent columns for classroom
        if not classroom:
            for col_offset in [-1, 1]:
                check_col = col_idx + col_offset
                if 0 <= check_col < len(table[row_idx]):
                    adj_cell = table[row_idx][check_col]
                    if adj_cell:
                        adj_text = str(adj_cell).strip()
                        if self._is_classroom(adj_text) and len(adj_text) < 20:
                            classroom = adj_text
                            break
        
        # Combine subject parts
        subject = ' '.join(subject_parts)
        
        # Clean up subject name
        subject = self._clean_subject_name(subject)
        
        if not subject:
            return None
        
        # Find appropriate time slot
        time_slot = self._find_time_slot_for_row(row_idx, time_slots)
        
        # Map day name to number
        day_map = {
            'DILLUNS': 1, 'DIMARTS': 2, 'DIMECRES': 3,
            'DIJOUS': 4, 'DIVENDRES': 5
        }
        day_num = day_map.get(day_name.upper(), 0)
        
        return {
            "subject": subject,
            "teacher": teacher,
            "classroom": self._normalize_classroom(classroom) if classroom else None,
            "semester": semester,
            "day_of_week": day_num,
            "day_name": day_name.title(),
            "start_time": time_slot[0],
            "end_time": time_slot[1]
        }
    
    def _is_classroom(self, text: str) -> bool:
        """Check if text contains a classroom reference."""
        if not text:
            return False
            
        text = text.strip()
        
        # Quick check for common classroom prefixes
        if text[:2] in ['P.', 'G.', 'L.', 'P0', 'G0', 'L0', 'P1', 'G1', 'L1', 'P2', 'G2', 'L2']:
            return True
            
        # Check against patterns
        for pattern in self.classroom_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
                
        return False
    
    def _is_teacher_name(self, text: str) -> bool:
        """Check if text looks like a teacher name."""
        if not text or len(text) < 5:
            return False
            
        # Teacher names usually have at least two words
        words = text.split()
        if len(words) < 2:
            return False
            
        # Check if it starts with a capital letter
        if not text[0].isupper():
            return False
            
        # Avoid common non-name patterns
        non_name_patterns = [
            r'^\d+',  # Starts with number
            r'^[PLGM]\d+',  # Classroom code
            r'Sala',
            r'Aula',
            r'Taller',
            r'Laboratori'
        ]
        
        for pattern in non_name_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return False
                
        return True
    
    def _clean_subject_name(self, subject: str) -> str:
        """Clean and complete subject names."""
        # Remove extra spaces
        subject = ' '.join(subject.split())
        
        # Fix common truncations
        truncation_fixes = {
            'Expressió': 'Expressió Gràfica',
            'Iniciació als': 'Iniciació als Projectes de Disseny',
            'Treball Final': 'Treball Final de Grau',
            'Programació per': 'Programació per a Dissenyadors',
            'Introducció al': 'Introducció al Disseny',
            'Taller de': 'Taller',  # This might need context
            'Història del': 'Història del Disseny',
            'Cultura del': 'Cultura del Disseny',
            'Laboratori de': 'Laboratori',
            'Fonaments del': 'Fonaments del Disseny'
        }
        
        for truncated, complete in truncation_fixes.items():
            if subject.startswith(truncated) and len(subject) <= len(truncated) + 5:
                subject = complete + subject[len(truncated):]
                
        return subject
    
    def _find_day_columns(self, table: List[List]) -> Dict[str, int]:
        """Find which columns correspond to which days."""
        day_columns = {}
        days = ['DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES']
        
        # Check first few rows for day names
        for row_idx in range(min(3, len(table))):
            row = table[row_idx]
            for col_idx, cell in enumerate(row):
                if cell:
                    cell_text = str(cell).upper()
                    for day in days:
                        if day in cell_text and day not in day_columns:
                            day_columns[day] = col_idx
                            
        return day_columns
    
    def _find_day_columns_from_text(self, page_text: str, table: List[List]) -> Dict[str, int]:
        """Find which columns correspond to which days from page text."""
        day_columns = {}
        days = ['DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES']
        
        # Look for day line in page text
        lines = page_text.split('\n')
        day_line = None
        for line in lines[:10]:  # Check first 10 lines
            if all(day in line.upper() for day in days[:3]):  # At least first 3 days
                day_line = line
                break
        
        if day_line:
            # Simple heuristic: assume equal spacing
            num_cols = len(table[0]) if table else 0
            if num_cols >= 5:
                cols_per_day = max(1, num_cols // 5)
                for i, day in enumerate(days):
                    day_columns[day] = i * cols_per_day
        
        return day_columns
    
    def _extract_time_slots(self, page_text: str, table: List[List]) -> List[Tuple[str, str]]:
        """Extract time slots from page text or table."""
        time_slots = []
        
        # First, look for explicit time patterns in text
        lines = page_text.split('\n')
        current_start = None
        
        for line in lines:
            # Look for time patterns like "09:00" or "11:00"
            time_match = re.search(r'(\d{1,2}:\d{2})', line)
            if time_match:
                time_str = self._normalize_time(time_match.group(1))
                
                # Check if this line contains just a time (likely a time marker)
                if len(line.strip()) <= 10:  # Short line, probably just time
                    if current_start:
                        # This is an end time
                        time_slots.append((current_start, time_str))
                        current_start = time_str
                    else:
                        # This is a start time
                        current_start = time_str
        
        # Add final slot if we have a hanging start time
        if current_start and not any(s[0] == current_start for s in time_slots):
            # Assume it goes until 13:30 or 19:30
            end_time = "19:30" if current_start >= "15:00" else "13:30"
            time_slots.append((current_start, end_time))
        
        # If no time slots found, determine from context
        if not time_slots:
            if 'tarda' in page_text.lower() or any(time in page_text for time in ['15:', '16:', '17:', '18:', '19:']):
                time_slots = [("15:00", "19:30")]
            else:
                time_slots = [("09:00", "13:30")]
                
        return time_slots
    
    def _find_time_slot_for_row(self, row_idx: int, time_slots: List[Tuple[str, str]]) -> Tuple[str, str]:
        """Find the appropriate time slot for a given row."""
        # For now, return the first time slot
        # This could be improved with better logic
        if time_slots:
            return time_slots[0]
        return ("09:00", "13:30")
    
    def _detect_semester(self, page_text: str) -> int:
        """Detect semester from page text."""
        text_upper = page_text.upper()
        if '2N SEMESTRE' in text_upper or 'SEGON SEMESTRE' in text_upper or '2º SEMESTRE' in text_upper:
            return 2
        return 1
    
    def _extract_group_from_text(self, page_text: str, course: int) -> Dict:
        """Extract group information from page text."""
        # Look for patterns like "2 M1", "3 Gt", etc.
        patterns = [
            r'(\d)\s*([MGT])\s*(\d)',  # 2 M1, 3 T1
            r'(\d)\s*([A-Za-z]{2,3})',  # 2 Gt, 3 Am
            r'(\d)[rntd]*\s+CURS',  # 1r CURS, 2n CURS
        ]
        
        for pattern in patterns:
            match = re.search(pattern, page_text[:500])
            if match:
                if 'CURS' in pattern:
                    code = f"{match.group(1)} CURS"
                    name = f"{match.group(1)}r curs"
                else:
                    code = match.group(0).strip()
                    name = self._build_group_name(code, course)
                    
                return {
                    'code': code.replace('\n', ' ').strip(),
                    'full_name': name
                }
                
        return {'code': 'Unknown', 'full_name': 'Unknown'}
    
    def _build_group_name(self, code: str, course: int) -> str:
        """Build a full group name from code."""
        # Parse the code
        match = re.match(r'(\d)\s*([A-Za-z]+)(\d*)', code)
        if not match:
            return code
            
        year = match.group(1)
        letters = match.group(2)
        number = match.group(3)
        
        # Determine shift
        shift = "Matí" if 'm' in letters.lower() or 'M' in letters or number == '1' else "Tarda"
        
        # Determine specialization
        spec_map = {
            'G': 'Gràfic',
            'A': 'Audiovisual',
            'I': 'Interiors',
            'M': 'Moda'
        }
        
        specialization = None
        for key, spec in spec_map.items():
            if key in letters.upper() and letters.upper() != 'M':  # M alone might be Matí
                specialization = spec
                break
                
        # Build name
        if course == 1:
            return f"1r {shift} ({code})"
        elif specialization:
            course_text = f"{course}n" if course == 2 else f"{course}r"
            return f"{course_text} {specialization} {shift} ({code})"
        else:
            return f"{course}n {shift} ({code})"
    
    def _organize_schedules(self, classes: List[Dict], degree: str, course: int) -> List[Dict]:
        """Organize classes into schedules by group."""
        # Group by group code
        groups = {}
        for class_info in classes:
            group_code = class_info.get('group_code', 'Unknown')
            # Clean group code by removing line breaks
            clean_group_code = group_code.replace('\n', ' ').strip()
            clean_group_code = ' '.join(clean_group_code.split())  # Normalize spaces
            
            if clean_group_code not in groups:
                groups[clean_group_code] = {
                    'group': class_info.get('group', 'Unknown'),
                    'classes': []
                }
            
            # Remove group fields from class
            clean_class = {k: v for k, v in class_info.items() 
                          if k not in ['group', 'group_code']}
            groups[clean_group_code]['classes'].append(clean_class)
        
        # Create schedule objects
        schedules = []
        for group_code, group_data in groups.items():
            # Determine specialization
            specialization = self._determine_specialization(
                group_data['group'], course, degree
            )
            
            schedule = {
                "degree": degree,
                "course": course,
                "specialization": specialization,
                "group": group_data['group'],
                "group_code": group_code.replace('\n', ' ').strip(),
                "classes": group_data['classes']
            }
            
            schedules.append(schedule)
            
        return schedules
    
    def _determine_specialization(self, group_name: str, course: int, degree: str) -> Optional[str]:
        """Determine specialization from group name."""
        if degree != "Grau en Disseny" or course == 1:
            return None
            
        spec_keywords = {
            'Gràfic': 'Gràfic',
            'Audiovisual': 'Audiovisual',
            'Interiors': 'Espais',
            'Espais': 'Espais',
            'Moda': 'Moda'
        }
        
        for keyword, spec in spec_keywords.items():
            if keyword in group_name:
                return spec
                
        return None
    
    def _parse_filename(self, filename: str) -> Tuple[str, int]:
        """Extract degree and course from filename."""
        if "GDIS" in filename:
            degree = "Grau en Disseny"
        elif "GBA" in filename:
            degree = "Grau en Belles Arts"
        else:
            degree = "Unknown"
            
        # Extract course number
        course_match = re.search(r'_(\d)[rndt]?_', filename)
        if course_match:
            course = int(course_match.group(1))
        else:
            course = 0
            
        return degree, course
    
    def _normalize_classroom(self, classroom: str) -> str:
        """Normalize classroom codes."""
        if not classroom:
            return classroom
            
        classroom = classroom.strip()
        
        # Apply normalization rules
        for pattern, replacement in self.classroom_normalizations.items():
            if re.match(pattern, classroom, re.IGNORECASE):
                classroom = re.sub(pattern, replacement, classroom, flags=re.IGNORECASE)
                break
                
        # Handle special cases
        # P1.6 -> P.1.6
        classroom = re.sub(r'([PLGM])(\d+)\.(\d+)', r'\1.\2.\3', classroom)
        
        # P1 2 -> P.1.2
        classroom = re.sub(r'([PLGM])(\d+)\s+(\d+)', r'\1.\2.\3', classroom)
        
        # Handle multiple classrooms
        if '+' in classroom:
            parts = classroom.split('+')
            normalized_parts = [self._normalize_classroom(part.strip()) for part in parts]
            classroom = '+'.join(normalized_parts)
        elif '/' in classroom:
            parts = classroom.split('/')
            normalized_parts = [self._normalize_classroom(part.strip()) for part in parts]
            classroom = '/'.join(normalized_parts)
            
        return classroom
    
    def _normalize_time(self, time_str: str) -> str:
        """Normalize time format to HH:MM."""
        time_str = time_str.strip()
        # Add leading zero if needed
        if len(time_str) == 4:  # H:MM
            time_str = '0' + time_str
        return time_str
    
    def _is_tutoria(self, subject: str) -> bool:
        """Check if subject is a tutoria."""
        if not subject:
            return False
        subject_lower = subject.lower()
        return any(t in subject_lower for t in ['tutoria', 'tutories', 'tutorias'])
    
    def save_results(self, data: Dict, output_path: str):
        """Save extraction results to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Results saved to {output_path}")
        
    def generate_summary(self, data: Dict) -> str:
        """Generate a summary report of extracted data."""
        summary = []
        summary.append(f"BAU Schedule Extraction Summary (V3)")
        summary.append(f"Academic Year: {data['academic_year']}")
        summary.append(f"Extraction Date: {data['extraction_date']}")
        summary.append(f"Total Groups: {data['total_schedules']}")
        summary.append("")
        
        # Count by degree and course
        degree_counts = {}
        for schedule in data['schedules']:
            key = f"{schedule['degree']} - {schedule['course']} curs"
            if schedule['specialization']:
                key += f" ({schedule['specialization']})"
            degree_counts[key] = degree_counts.get(key, 0) + 1
            
        summary.append("Groups by degree and course:")
        for key, count in sorted(degree_counts.items()):
            summary.append(f"  {key}: {count} groups")
            
        # Count total classes
        total_classes = sum(len(s['classes']) for s in data['schedules'])
        summary.append(f"\nTotal Classes: {total_classes}")
        
        # Count classes with/without classrooms
        if total_classes > 0:
            with_classroom = sum(1 for s in data['schedules'] 
                               for c in s['classes'] if c['classroom'])
            without_classroom = total_classes - with_classroom
            
            summary.append(f"Classes with classroom: {with_classroom} ({with_classroom/total_classes*100:.1f}%)")
            summary.append(f"Classes without classroom: {without_classroom} ({without_classroom/total_classes*100:.1f}%)")
            
            # List subjects without classrooms
            missing_subjects = set()
            for s in data['schedules']:
                for c in s['classes']:
                    if not c['classroom']:
                        missing_subjects.add(c['subject'])
                        
            if missing_subjects:
                summary.append("\nSubjects without classrooms:")
                for subj in sorted(missing_subjects)[:10]:
                    summary.append(f"  - {subj}")
                if len(missing_subjects) > 10:
                    summary.append(f"  ... and {len(missing_subjects) - 10} more")
        else:
            summary.append("No classes found in extracted data")
        
        return "\n".join(summary)


def main():
    """Main execution function."""
    extractor = ScheduleExtractorV3()
    
    logger.info("Starting PDF schedule extraction (Version 3)...")
    
    # Extract all schedules
    results = extractor.extract_all_pdfs()
    
    # Save results
    output_path = "/Users/josepmarimon/Documents/github/bau-assist/data/schedules_extracted_v3_2025-2026.json"
    extractor.save_results(results, output_path)
    
    # Generate and print summary
    summary = extractor.generate_summary(results)
    print("\n" + summary)
    
    # Save summary
    summary_path = "/Users/josepmarimon/Documents/github/bau-assist/data/extraction_summary_v3.txt"
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(summary)
    logger.info(f"Summary saved to {summary_path}")


if __name__ == "__main__":
    main()