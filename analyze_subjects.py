#!/usr/bin/env python3
import csv
import json

# Read CSV subjects
csv_subjects = set()

# Read Belles Arts subjects
with open('csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv', 'r', encoding='ISO-8859-1') as f:
    reader = csv.reader(f, delimiter=';')
    for row in reader:
        if len(row) > 3 and row[3].startswith('GB'):
            csv_subjects.add(row[3])

# Read Disseny subjects  
with open('csv/AssignacioDocent_2526_Preparacio(DISSENY).csv', 'r', encoding='ISO-8859-1') as f:
    reader = csv.reader(f, delimiter=';')
    for row in reader:
        if len(row) > 3 and row[3].startswith('GD'):
            csv_subjects.add(row[3])

print("=== SUBJECTS IN CSV FILES ===")
print(f"Total subjects in CSVs: {len(csv_subjects)}")
print("\nBelles Arts subjects (GB*):")
gb_subjects = sorted([s for s in csv_subjects if s.startswith('GB')])
for s in gb_subjects:
    print(f"  {s}")

print("\nDisseny subjects (GD*):")
gd_subjects = sorted([s for s in csv_subjects if s.startswith('GD')])
for s in gd_subjects:
    print(f"  {s}")

# Read database subjects from the query results
db_subjects_raw = [
    "GD301", "GD302", "GD303", "GD304", "GD305", "GD306", 
    "GD401", "GD402", "GD403", "GD404", "GD405", "GD499",
    "GDB001", "GDB002", "GDB011", "GDB032", "GDB042", "GDB052",
    "GDF001", "GDF002", "GDF011", "GDF012", "GDF021", "GDF022", 
    "GDF031", "GDF032", "GDF041", "GDF051", "GDF061", "GDF071",
    "GDOPT", "GDP012", "GDP022", "GDT074",
    "GDVA03", "GDVA04", "GDVA13", "GDVA14", "GDVA23", "GDVA24",
    "GDVA33", "GDVA34", "GDVA43", "GDVA44", "GDVA53", "GDVA54",
    "GDVA63", "GDVA73", "GDVA83", "GDVA93",
    "GDVG03", "GDVG04", "GDVG13", "GDVG14", "GDVG23", "GDVG24",
    "GDVG33", "GDVG34", "GDVG43", "GDVG44", "GDVG53", "GDVG54",
    "GDVG63", "GDVG73", "GDVG83", "GDVG93",
    "GDVI03", "GDVI04", "GDVI13", "GDVI14", "GDVI23", "GDVI24",
    "GDVI33", "GDVI34", "GDVI43", "GDVI44", "GDVI53", "GDVI54",
    "GDVI63", "GDVI73", "GDVI83", "GDVI93",
    "GDVM03", "GDVM04", "GDVM13", "GDVM14", "GDVM23", "GDVM24",
    "GDVM33", "GDVM34", "GDVM43", "GDVM44", "GDVM53", "GDVM54",
    "GDVM63", "GDVM73", "GDVM83", "GDVM93"
]

db_subjects = set(db_subjects_raw)

print("\n=== SUBJECTS IN DATABASE ===")
print(f"Total subjects in DB: {len(db_subjects)}")

# Find discrepancies
print("\n=== DISCREPANCIES ===")

# Subjects in CSV but not in DB
missing_in_db = csv_subjects - db_subjects
if missing_in_db:
    print("\nSubjects in CSV but NOT in database:")
    for s in sorted(missing_in_db):
        print(f"  {s}")
else:
    print("\nNo subjects missing from database")

# Subjects in DB but not in CSV (fictitious)
fictitious = db_subjects - csv_subjects
if fictitious:
    print("\nFICTITIOUS subjects (in database but NOT in CSV):")
    for s in sorted(fictitious):
        print(f"  {s}")
else:
    print("\nNo fictitious subjects found")

# Common subjects
common = csv_subjects & db_subjects
print(f"\nSubjects present in both CSV and database: {len(common)}")