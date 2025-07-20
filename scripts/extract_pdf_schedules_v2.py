#!/usr/bin/env python3
"""
Extract schedule data from PDF files for BAU university courses - Version 2.
Adapted to handle the actual PDF structure with merged cells and special formatting.
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

class ScheduleExtractorV2:
    """Extract schedule information from BAU PDF files - Version 2."""
    
    def __init__(self, pdf_dir: str = "/Users/josepmarimon/Documents/github/bau-assist/horaris/pdf"):
        self.pdf_dir = Path(pdf_dir)
        self.academic_year = "2025-2026"
        
        # Day mapping - now by column position
        self.day_positions = {
            0: 1,  # Monday
            1: 2,  # Tuesday
            2: 3,  # Wednesday
            3: 4,  # Thursday
            4: 5   # Friday
        }
        
        # Time slots typically used
        self.common_time_slots = [
            ("09:00", "11:00"),
            ("11:00", "11:30"),
            ("11:30", "13:30"),
            ("09:00", "13:30"),
            ("13:30", "14:30"),
            ("15:00", "17:00"),
            ("17:00", "17:30"),
            ("17:30", "19:30"),
            ("15:00", "19:30"),
            ("19:30", "20:30")
        ]
        
        # Specialization patterns
        self.specialization_patterns = {
            'Gràfic': ['Gràfic', 'Grafic', 'GRÀFIC', 'Gt', 'Gm'],
            'Audiovisual': ['Audiovisual', 'AUDIOVISUAL', 'At', 'Am'],
            'Espais': ['Interiors', 'Espais', 'INTERIORS', 'ESPAIS', 'It', 'Im'],
            'Moda': ['Moda', 'MODA', 'Mt', 'Mm']
        }
        
        # Classroom normalization
        self.classroom_normalizations = {
            r'^P(\d)\.(\d+)$': r'P.\1.\2',
            r'^G(\d)\.(\d+)$': r'G.\1.\2',
            r'^L(\d)\.(\d+)$': r'L.\1.\2',
            r'^Pt\.2$': 'P.2.2',
            r'^G\.4$': 'G.0.4',
            r'^Sala Carolines?$': 'SALA_CAROLINES',
            r'^Portàtils$': 'PORTATILS'
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
            "extraction_date": datetime.now().strftime("%Y-%m-%d"),
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
            current_semester = 1  # Default to first semester
            current_group = None
            
            for page_num, page in enumerate(pdf.pages):
                logger.debug(f"Processing page {page_num + 1}")
                
                # Extract text to find group and semester info
                text = page.extract_text() or ""
                
                # Look for group identifier (e.g., "2 M1", "3 Gt")
                group_match = re.search(r'(\d+)\s*([A-Za-z]+\d*)', text[:200])
                if group_match:
                    current_group = group_match.group(0)
                    
                # Detect semester
                if "2n SEMESTRE" in text.upper() or "SEGON SEMESTRE" in text.upper():
                    current_semester = 2
                elif "1r SEMESTRE" in text.upper() or "PRIMER SEMESTRE" in text.upper():
                    current_semester = 1
                
                # Extract tables
                tables = page.extract_tables()
                
                for table_idx, table in enumerate(tables):
                    # Parse each table separately
                    classes = self._parse_schedule_table_v2(
                        table, degree, course, current_semester, current_group, text
                    )
                    
                    if classes:
                        # Group classes by student group
                        grouped = self._group_classes_by_group(classes, degree, course)
                        schedules.extend(grouped)
        
        return schedules
    
    def _parse_schedule_table_v2(self, table: List[List], degree: str, course: int, 
                                 semester: int, group_code: str, page_text: str) -> List[Dict]:
        """Parse schedule table with improved logic for BAU format."""
        classes = []
        
        if not table or len(table) < 2:
            return classes
            
        # The table structure is typically:
        # Row 0: Subject names (spanning multiple cells)
        # Row 1: Teacher names and classrooms
        # Row 2: Continuation or empty
        # ...
        
        # Process by columns (days)
        num_cols = len(table[0])
        day_width = 2  # Each day typically spans 2 columns
        
        for day_idx in range(0, num_cols, day_width):
            if day_idx // day_width >= 5:  # Only Mon-Fri
                break
                
            day_num = (day_idx // day_width) + 1
            
            # Check each time slot
            current_time_slot = None
            
            # Look for time indicators in page text
            time_matches = re.findall(r'(\d{1,2}:\d{2})', page_text)
            if len(time_matches) >= 2:
                current_time_slot = (time_matches[0], time_matches[-1])
            else:
                # Use default time slots based on position
                if "09:00" in page_text:
                    current_time_slot = ("09:00", "13:30")
                elif "15:00" in page_text:
                    current_time_slot = ("15:00", "19:30")
                    
            # Extract subject from first row
            if day_idx < len(table[0]):
                subject_cell = table[0][day_idx]
                if subject_cell and not self._is_tutoria(str(subject_cell)):
                    # Parse the cell content
                    class_info = self._parse_complex_cell(
                        table, 0, day_idx, day_num, current_time_slot, semester
                    )
                    if class_info:
                        class_info['group'] = group_code
                        classes.append(class_info)
        
        return classes
    
    def _parse_complex_cell(self, table: List[List], row_idx: int, col_idx: int,
                           day_num: int, time_slot: Tuple[str, str], semester: int) -> Optional[Dict]:
        """Parse a complex cell that may span multiple rows."""
        # Get subject from current row
        subject_cell = table[row_idx][col_idx] if col_idx < len(table[row_idx]) else None
        if not subject_cell:
            return None
            
        lines = str(subject_cell).strip().split('\n')
        subject = lines[0].strip()
        
        # Initialize variables
        teacher = None
        classroom = None
        
        # Look for teacher and classroom in same cell
        if len(lines) > 1:
            for line in lines[1:]:
                # Check if it's a classroom
                if re.search(r'[PLGM]\d+\.?\d*|Sala|sala|Portàtils', line):
                    classroom = line.strip()
                # Otherwise might be teacher
                elif not classroom and line.strip():
                    teacher = line.strip()
        
        # Also check next row for additional info
        if row_idx + 1 < len(table) and col_idx < len(table[row_idx + 1]):
            next_cell = table[row_idx + 1][col_idx]
            if next_cell:
                next_lines = str(next_cell).strip().split('\n')
                for line in next_lines:
                    if re.search(r'[PLGM]\d+\.?\d*|Sala|sala|Portàtils', line):
                        if not classroom:
                            classroom = line.strip()
                    elif not teacher and line.strip() and not line.startswith('Tutor'):
                        teacher = line.strip()
        
        if not subject or self._is_tutoria(subject):
            return None
            
        return {
            "subject": subject,
            "teacher": teacher,
            "classroom": self._normalize_classroom(classroom) if classroom else None,
            "semester": semester,
            "day_of_week": day_num,
            "day_name": self._get_day_name(day_num),
            "start_time": time_slot[0] if time_slot else "09:00",
            "end_time": time_slot[1] if time_slot else "13:30"
        }
    
    def _group_classes_by_group(self, classes: List[Dict], degree: str, course: int) -> List[Dict]:
        """Group classes by student group."""
        # Group classes by their group code
        groups = {}
        for class_info in classes:
            group_code = class_info.get('group', 'Unknown')
            if group_code not in groups:
                groups[group_code] = []
            groups[group_code].append(class_info)
        
        # Create schedule objects
        schedules = []
        for group_code, group_classes in groups.items():
            # Determine specialization
            specialization = self._determine_specialization(group_code, course, degree)
            
            # Create full group name
            if course == 1:
                group_name = f"{course}r Matí ({group_code})" if 'M' in group_code else f"{course}r Tarda ({group_code})"
            else:
                # For 2nd year and above, include specialization
                shift = "Matí" if 'm' in group_code.lower() else "Tarda"
                if specialization:
                    group_name = f"{course}n {specialization} {shift} ({group_code})"
                else:
                    group_name = f"{course}n {shift} ({group_code})"
            
            # Remove group field from classes
            for c in group_classes:
                c.pop('group', None)
            
            schedule = {
                "degree": degree,
                "course": course,
                "specialization": specialization,
                "group": group_name,
                "group_code": group_code,
                "classes": group_classes
            }
            
            schedules.append(schedule)
        
        return schedules
    
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
                
        # General normalization
        classroom = re.sub(r'([PLGM])(\d)\.', r'\1.\2.', classroom)
        
        return classroom
    
    def _get_day_name(self, day_num: int) -> str:
        """Get day name from number."""
        day_names = {1: "Dilluns", 2: "Dimarts", 3: "Dimecres", 
                    4: "Dijous", 5: "Divendres"}
        return day_names.get(day_num, "Unknown")
    
    def _determine_specialization(self, group_name: str, course: int, degree: str) -> Optional[str]:
        """Determine specialization from group name."""
        if degree != "Grau en Disseny" or course == 1:
            return None
            
        group_upper = group_name.upper()
        
        for spec, patterns in self.specialization_patterns.items():
            if any(pattern.upper() in group_upper for pattern in patterns):
                return spec
                
        return None
    
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
        summary.append(f"BAU Schedule Extraction Summary")
        summary.append(f"Academic Year: {data['academic_year']}")
        summary.append(f"Extraction Date: {data['extraction_date']}")
        summary.append(f"Total Groups: {data['total_schedules']}")
        summary.append("")
        
        # Count by degree and course
        degree_counts = {}
        for schedule in data['schedules']:
            key = f"{schedule['degree']} - {schedule['course']}r curs"
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
        else:
            summary.append("No classes found in extracted data")
        
        return "\n".join(summary)


def main():
    """Main execution function."""
    extractor = ScheduleExtractorV2()
    
    logger.info("Starting PDF schedule extraction (Version 2)...")
    
    # Extract all schedules
    results = extractor.extract_all_pdfs()
    
    # Save results
    output_path = "/Users/josepmarimon/Documents/github/bau-assist/data/schedules_extracted_2025-2026.json"
    extractor.save_results(results, output_path)
    
    # Generate and print summary
    summary = extractor.generate_summary(results)
    print("\n" + summary)
    
    # Save summary
    summary_path = "/Users/josepmarimon/Documents/github/bau-assist/data/extraction_summary.txt"
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(summary)
    logger.info(f"Summary saved to {summary_path}")


if __name__ == "__main__":
    main()