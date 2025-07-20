#!/usr/bin/env python3
"""
Extract schedule data from PDF files for BAU university courses.
This script processes PDF files containing course schedules and extracts
structured data including subjects, teachers, classrooms, and time slots.
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

class ScheduleExtractor:
    """Extract schedule information from BAU PDF files."""
    
    def __init__(self, pdf_dir: str = "/Users/josepmarimon/Documents/github/bau-assist/horaris/pdf"):
        self.pdf_dir = Path(pdf_dir)
        self.academic_year = "2025-2026"
        
        # Day mapping
        self.day_map = {
            'DILLUNS': 1,
            'DIMARTS': 2,
            'DIMECRES': 3,
            'DIJOUS': 4,
            'DIVENDRES': 5
        }
        
        # Specialization detection patterns
        self.specialization_patterns = {
            'Gràfic': ['Gràfic', 'Grafic', 'GRÀFIC'],
            'Audiovisual': ['Audiovisual', 'AUDIOVISUAL'],
            'Espais': ['Interiors', 'Espais', 'INTERIORS', 'ESPAIS'],
            'Moda': ['Moda', 'MODA']
        }
        
        # Classroom normalization rules
        self.classroom_normalizations = {
            r'^P(\d)\.(\d+)$': r'P.\1.\2',
            r'^G(\d)\.(\d+)$': r'G.\1.\2',
            r'^L(\d)\.(\d+)$': r'L.\1.\2',
            r'^Pt\.2$': 'P.2.2',
            r'^G\.4$': 'G.0.4',
            r'^Sala Carolines$': 'SALA_CAROLINES',
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
            except Exception as e:
                logger.error(f"Error processing {pdf_file.name}: {str(e)}")
                continue
                
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
            current_semester = None
            
            for page_num, page in enumerate(pdf.pages):
                logger.debug(f"Processing page {page_num + 1} of {pdf_path.name}")
                
                # Detect semester from page content
                page_text = page.extract_text() or ""
                if "1r SEMESTRE" in page_text or "PRIMER SEMESTRE" in page_text:
                    current_semester = 1
                elif "2n SEMESTRE" in page_text or "SEGON SEMESTRE" in page_text:
                    current_semester = 2
                elif current_semester is None:
                    # Default to semester 1 for first pages
                    current_semester = 1
                
                # Extract tables from page
                tables = page.extract_tables()
                for table in tables:
                    schedule = self._parse_schedule_table(
                        table, degree, course, current_semester
                    )
                    if schedule:
                        schedules.append(schedule)
        
        return schedules
    
    def _parse_filename(self, filename: str) -> Tuple[str, int]:
        """Extract degree and course from filename."""
        # Examples: HorarisGDIS_2n_2526.pdf, Horaris_GBA_1r_2526.pdf
        
        if "GDIS" in filename:
            degree = "Grau en Disseny"
        elif "GBA" in filename:
            degree = "Grau en Belles Arts"
        else:
            degree = "Unknown"
            
        # Extract course number
        course_match = re.search(r'_(\d)[rndt]_', filename)
        if course_match:
            course = int(course_match.group(1))
        else:
            course = 0
            
        return degree, course
    
    def _parse_schedule_table(self, table: List[List], degree: str, 
                            course: int, semester: int) -> Optional[Dict]:
        """Parse a schedule table and extract class information."""
        if not table or len(table) < 3:
            return None
            
        # Try to identify the structure
        header_row = table[0]
        if not any(day in str(header_row) for day in self.day_map.keys()):
            return None
            
        # Find group information
        group_info = self._extract_group_info(table)
        if not group_info:
            return None
            
        # Extract classes
        classes = self._extract_classes(table, semester)
        
        # Filter out tutories
        classes = [c for c in classes if not self._is_tutoria(c['subject'])]
        
        if not classes:
            return None
            
        # Determine specialization
        specialization = self._determine_specialization(group_info['name'], course, degree)
        
        schedule = {
            "degree": degree,
            "course": course,
            "specialization": specialization,
            "group": group_info['full_name'],
            "group_code": group_info['code'],
            "classes": classes
        }
        
        return schedule
    
    def _extract_group_info(self, table: List[List]) -> Optional[Dict]:
        """Extract group information from table."""
        # Group info is usually in first column or row
        for row in table[:3]:  # Check first 3 rows
            for cell in row:
                if cell and isinstance(cell, str):
                    # Pattern: "2n Gràfic Tarda (2 Gt)"
                    match = re.search(r'(\d[rndt].*?)\s*\(([^)]+)\)', cell)
                    if match:
                        return {
                            'full_name': match.group(0),
                            'name': match.group(1),
                            'code': match.group(2)
                        }
        return None
    
    def _extract_classes(self, table: List[List], semester: int) -> List[Dict]:
        """Extract individual classes from table."""
        classes = []
        
        # Find day columns
        header_row = table[0]
        day_columns = {}
        for idx, cell in enumerate(header_row):
            if cell:
                for day_name, day_num in self.day_map.items():
                    if day_name in str(cell).upper():
                        day_columns[day_num] = idx
                        break
        
        if not day_columns:
            return classes
            
        # Process each row
        for row_idx in range(1, len(table)):
            row = table[row_idx]
            
            # Extract time slot
            time_slot = self._extract_time_slot(row)
            if not time_slot:
                continue
                
            # Extract classes for each day
            for day_num, col_idx in day_columns.items():
                if col_idx < len(row) and row[col_idx]:
                    class_info = self._parse_class_cell(
                        row[col_idx], day_num, time_slot, semester
                    )
                    if class_info:
                        classes.append(class_info)
        
        return classes
    
    def _extract_time_slot(self, row: List) -> Optional[Dict]:
        """Extract time slot from row."""
        # Time is usually in first cell
        if row and row[0]:
            time_match = re.search(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', str(row[0]))
            if time_match:
                return {
                    'start': self._normalize_time(time_match.group(1)),
                    'end': self._normalize_time(time_match.group(2))
                }
        return None
    
    def _parse_class_cell(self, cell: str, day: int, 
                         time_slot: Dict, semester: int) -> Optional[Dict]:
        """Parse a single class cell."""
        if not cell or isinstance(cell, float):
            return None
            
        lines = str(cell).strip().split('\n')
        if not lines:
            return None
            
        # Extract components
        subject = lines[0].strip()
        teacher = None
        classroom = None
        
        # Teacher is usually second line
        if len(lines) > 1:
            teacher = lines[1].strip()
            
        # Classroom is usually last line or in parentheses
        for line in reversed(lines):
            classroom_match = re.search(r'([PLGM]\d*\.?\d+(?:/[PLGM]\d*\.?\d+)?)', line)
            if classroom_match:
                classroom = classroom_match.group(1)
                break
            elif any(keyword in line.upper() for keyword in ['SALA', 'PORTÀTILS']):
                classroom = line.strip()
                break
                
        if not subject:
            return None
            
        class_info = {
            "subject": subject,
            "teacher": teacher,
            "classroom": self._normalize_classroom(classroom) if classroom else None,
            "semester": semester,
            "day_of_week": day,
            "day_name": self._get_day_name(day),
            "start_time": time_slot['start'],
            "end_time": time_slot['end']
        }
        
        return class_info
    
    def _normalize_classroom(self, classroom: str) -> str:
        """Normalize classroom codes."""
        if not classroom:
            return classroom
            
        classroom = classroom.strip()
        
        # Apply normalization rules
        for pattern, replacement in self.classroom_normalizations.items():
            if re.match(pattern, classroom):
                classroom = re.sub(pattern, replacement, classroom)
                break
                
        # General normalization for standard rooms
        # P1.6 -> P.1.6
        classroom = re.sub(r'([PLGM])(\d)\.', r'\1.\2.', classroom)
        
        return classroom
    
    def _normalize_time(self, time_str: str) -> str:
        """Normalize time format to HH:MM."""
        time_str = time_str.strip()
        # Add leading zero if needed
        if len(time_str) == 4:  # H:MM
            time_str = '0' + time_str
        return time_str
    
    def _get_day_name(self, day_num: int) -> str:
        """Get day name from number."""
        day_names = {1: "Dilluns", 2: "Dimarts", 3: "Dimecres", 
                    4: "Dijous", 5: "Divendres"}
        return day_names.get(day_num, "Unknown")
    
    def _determine_specialization(self, group_name: str, course: int, 
                                degree: str) -> Optional[str]:
        """Determine specialization from group name."""
        if degree != "Grau en Disseny" or course == 1:
            return None
            
        group_upper = group_name.upper()
        
        for spec, patterns in self.specialization_patterns.items():
            if any(pattern.upper() in group_upper for pattern in patterns):
                return spec
                
        return None
    
    def _is_tutoria(self, subject: str) -> bool:
        """Check if subject is a tutoria (to be excluded)."""
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
    extractor = ScheduleExtractor()
    
    logger.info("Starting PDF schedule extraction...")
    
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