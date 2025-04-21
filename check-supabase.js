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

async function checkSupabase() {
  try {
    console.log('Checking Supabase configuration...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Check if we can connect to Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error connecting to Supabase:', userError);
    } else {
      console.log('Successfully connected to Supabase');
    }
    
    // List buckets
    console.log('Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Buckets:', buckets.map(b => b.name));
      
      // Check if mockups bucket exists
      const mockupBucket = buckets.find(b => b.name === 'mockups');
      if (mockupBucket) {
        console.log('Mockups bucket exists!');
        
        // Check bucket permissions
        console.log('Checking bucket permissions...');
        
        // Try to upload a test file
        const testContent = Buffer.from('test file');
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('mockups')
          .upload('test.txt', testContent, {
            contentType: 'text/plain',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading test file:', uploadError);
        } else {
          console.log('Test file uploaded successfully!');
          
          // Get public URL
          const { data: { publicUrl } } = supabase
            .storage
            .from('mockups')
            .getPublicUrl('test.txt');
          
          console.log('Public URL:', publicUrl);
          
          // Delete test file
          const { error: deleteError } = await supabase
            .storage
            .from('mockups')
            .remove(['test.txt']);
          
          if (deleteError) {
            console.error('Error deleting test file:', deleteError);
          } else {
            console.log('Test file deleted successfully!');
          }
        }
      } else {
        console.log('Mockups bucket does not exist. Creating...');
        
        // Create mockups bucket
        const { data: createData, error: createError } = await supabase
          .storage
          .createBucket('mockups', {
            public: true
          });
        
        if (createError) {
          console.error('Error creating mockups bucket:', createError);
        } else {
          console.log('Mockups bucket created successfully!');
        }
      }
    }
    
    // Check if mockup_leads table exists
    console.log('Checking if mockup_leads table exists...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('mockup_leads')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking mockup_leads table:', tableError);
      
      if (tableError.code === '42P01') { // Table doesn't exist
        console.log('Table does not exist. Creating...');
        
        // Create table using SQL
        const { error: createTableError } = await supabase.rpc('exec_sql', {
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
        
        if (createTableError) {
          console.error('Error creating table:', createTableError);
          console.log('Please create the table manually in the Supabase dashboard');
        } else {
          console.log('Table created successfully!');
        }
      }
    } else {
      console.log('mockup_leads table exists!');
    }
    
    console.log('Supabase check completed');
  } catch (error) {
    console.error('Error checking Supabase:', error);
  }
}

checkSupabase();
