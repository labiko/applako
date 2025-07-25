const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://nmwnibzgvwltipntwzho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeDatabase() {
    try {
        console.log('Connecting to Supabase database...\n');

        // First, let's check what tables exist
        console.log('=== CHECKING ALL TABLES ===');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (tablesError) {
            // Try alternative approach - list tables by attempting to query them
            console.log('Could not query information_schema, trying alternative approach...');
            
            // Check if reservations table exists by trying to query it
            const { data: reservationsTest, error: reservationsError } = await supabase
                .from('reservations')
                .select('*')
                .limit(1);

            if (!reservationsError) {
                console.log('✓ "reservations" table exists!');
            } else {
                console.log('✗ "reservations" table not found:', reservationsError.message);
            }
        } else {
            console.log('Tables in database:');
            tables.forEach(table => console.log(`  - ${table.table_name}`));
        }

        // Now let's analyze the reservations table structure
        console.log('\n=== ANALYZING RESERVATIONS TABLE ===');
        
        // Get column information
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
            .eq('table_schema', 'public')
            .eq('table_name', 'reservations')
            .order('ordinal_position');

        if (columnsError) {
            console.log('Could not query column information:', columnsError.message);
            
            // Alternative: get sample data to infer structure
            console.log('\nTrying to get sample data...');
            const { data: sampleData, error: sampleError } = await supabase
                .from('reservations')
                .select('*')
                .limit(5);

            if (!sampleError && sampleData && sampleData.length > 0) {
                console.log('\nInferred structure from sample data:');
                const firstRecord = sampleData[0];
                Object.keys(firstRecord).forEach(key => {
                    const value = firstRecord[key];
                    const type = value === null ? 'unknown' : typeof value;
                    console.log(`  ${key}: ${type} (sample: ${JSON.stringify(value)})`);
                });

                console.log('\n=== SAMPLE RECORDS ===');
                sampleData.forEach((record, index) => {
                    console.log(`\nRecord ${index + 1}:`);
                    console.log(JSON.stringify(record, null, 2));
                });
            } else {
                console.log('Could not retrieve sample data:', sampleError?.message || 'Unknown error');
            }
        } else if (columns && columns.length > 0) {
            console.log('Table structure:');
            columns.forEach(col => {
                console.log(`  ${col.column_name}:`);
                console.log(`    Type: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
                console.log(`    Nullable: ${col.is_nullable}`);
                if (col.column_default) {
                    console.log(`    Default: ${col.column_default}`);
                }
            });

            // Get sample records
            console.log('\n=== SAMPLE RECORDS ===');
            const { data: sampleData, error: sampleError } = await supabase
                .from('reservations')
                .select('*')
                .limit(5);

            if (!sampleError && sampleData) {
                console.log(`Found ${sampleData.length} sample records:`);
                sampleData.forEach((record, index) => {
                    console.log(`\nRecord ${index + 1}:`);
                    console.log(JSON.stringify(record, null, 2));
                });
            }
        } else {
            console.log('No column information found for reservations table.');
        }

        // Check for any constraints or indexes
        console.log('\n=== CHECKING CONSTRAINTS ===');
        const { data: constraints, error: constraintsError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name, constraint_type')
            .eq('table_schema', 'public')
            .eq('table_name', 'reservations');

        if (!constraintsError && constraints) {
            console.log('Constraints:');
            constraints.forEach(constraint => {
                console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
            });
        }

    } catch (error) {
        console.error('Error analyzing database:', error);
    }
}

// Run the analysis
analyzeDatabase();