const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabase() {
  try {
    console.log('Setting up Supabase...');
    
    // Create mockup_leads table
    const { error: tableError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'mockup_leads',
      columns: `
        id uuid primary key default uuid_generate_v4(),
        email text not null,
        name text,
        phone text,
        mockup_url text not null,
        created_at timestamp with time zone default now()
      `
    });
    
    if (tableError) {
      console.error('Error creating table:', tableError);
      
      // Alternative approach if RPC is not available
      console.log('Trying alternative approach...');
      
      // Check if table exists
      const { data: tableExists } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'mockup_leads')
        .eq('table_schema', 'public');
      
      if (!tableExists || tableExists.length === 0) {
        console.log('Table does not exist, creating...');
        
        // Create the table using SQL
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE public.mockup_leads (
              id uuid primary key default uuid_generate_v4(),
              email text not null,
              name text,
              phone text,
              mockup_url text not null,
              created_at timestamp with time zone default now()
            );
            
            CREATE INDEX mockup_leads_email_idx ON public.mockup_leads (email);
          `
        });
        
        if (sqlError) {
          console.error('Error creating table with SQL:', sqlError);
          console.log('Please create the table manually in the Supabase dashboard');
        } else {
          console.log('Table created successfully with SQL');
        }
      } else {
        console.log('Table already exists');
      }
    } else {
      console.log('Table created or already exists');
    }
    
    // Create storage bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    const mockupBucket = buckets.find(b => b.name === 'mockups');
    
    if (!mockupBucket) {
      console.log('Creating mockups bucket...');
      const { error: createBucketError } = await supabase
        .storage
        .createBucket('mockups', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg']
        });
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
      } else {
        console.log('Bucket created successfully');
      }
    } else {
      console.log('Mockups bucket already exists');
    }
    
    console.log('Supabase setup completed');
  } catch (error) {
    console.error('Error setting up Supabase:', error);
  }
}

setupSupabase();
