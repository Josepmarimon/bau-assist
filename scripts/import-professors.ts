import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importProfessors() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('/Users/josepmarimon/Documents/github/bau-assist/csv/Professors BAU Disseny.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} professors to import`);
    console.log('First row sample:', data[0]);

    // Process each professor
    const professors = data.map((row: any) => {
      // Extract names from PDI field if available
      let firstName = row['Nom'] || '';
      let lastName = row['Cognoms'] || '';
      
      // If PDI exists and contains comma, parse it
      if (row['PDI'] && row['PDI'].includes(',')) {
        const parts = row['PDI'].split(',');
        lastName = parts[0].trim();
        firstName = parts[1]?.trim() || firstName;
      }

      return {
        id_profe: row['ID Profe'] || null,
        first_name: firstName,
        last_name: lastName,
        email: row['Email'] || `professor${Math.random().toString(36).substring(7)}@bau.edu`,
        pdi: row['PDI'] || null,
        titulacio: row['Titulacio'] || null,
        doctorat_estat: row['Doctorat Estat'] || null,
        doctorat_any: row['Doctorat Any'] ? parseInt(row['Doctorat Any']) : null,
        department: row['Departament'] || null,
        code: row['ID Profe'] || `PROF${Math.floor(Math.random() * 9000) + 1000}`,
        contract_type: 'full-time',
        max_hours: 20
      };
    });

    console.log('\nImporting professors to database...');

    // Insert in batches to avoid timeouts
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < professors.length; i += batchSize) {
      const batch = professors.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await supabase
        .from('teachers')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        continue;
      }

      imported += insertedData?.length || 0;
      console.log(`Imported ${imported} of ${professors.length} professors...`);
    }

    console.log(`\nSuccessfully imported ${imported} professors!`);

  } catch (error) {
    console.error('Error importing professors:', error);
  }
}

importProfessors();