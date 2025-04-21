const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://zqeypptzvwelnlkqbcco.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabase() {
  try {
    console.log('Setting up Supabase tables...');
    
    // Create mockup_leads table if it doesn't exist
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'mockup_leads',
      columns: `
        id uuid primary key default uuid_generate_v4(),
        email text not null,
        name text,
        phone text,
        mockup_url text not null,
        active_campaign_id text,
        manychat_id text,
        created_at timestamp with time zone default now()
      `
    });
    
    if (error) {
      console.error('Error creating table with RPC:', error);
      
      // Try SQL query directly
      console.log('Trying SQL query directly...');
      
      const { error: sqlError } = await supabase.from('mockup_leads').select('count').limit(1);
      
      if (sqlError && sqlError.code === '42P01') { // Table doesn't exist
        console.log('Table does not exist, creating with SQL...');
        
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE public.mockup_leads (
              id uuid primary key default uuid_generate_v4(),
              email text not null,
              name text,
              phone text,
              mockup_url text not null,
              active_campaign_id text,
              manychat_id text,
              created_at timestamp with time zone default now()
            );
            
            CREATE INDEX mockup_leads_email_idx ON public.mockup_leads (email);
          `
        });
        
        if (createError) {
          console.error('Error creating table with SQL:', createError);
          console.log('Please create the table manually in the Supabase dashboard');
        } else {
          console.log('Table created successfully with SQL');
        }
      } else if (sqlError) {
        console.error('Error checking if table exists:', sqlError);
      } else {
        console.log('Table already exists');
      }
    } else {
      console.log('Table created or already exists');
    }
    
    // Check if storage bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
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
    }
    
    console.log('Supabase setup completed');
  } catch (error) {
    console.error('Error setting up Supabase:', error);
  }
}

setupSupabase();
