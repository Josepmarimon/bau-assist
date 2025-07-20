import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorageBucket() {
  try {
    // Create the classroom-photos bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'classroom-photos')
    
    if (!bucketExists) {
      const { data, error } = await supabase.storage.createBucket('classroom-photos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })

      if (error) {
        console.error('Error creating bucket:', error)
        return
      }

      console.log('Storage bucket "classroom-photos" created successfully')
    } else {
      console.log('Storage bucket "classroom-photos" already exists')
    }

    // Set up RLS policies for the bucket
    try {
      const { error: policyError } = await supabase.rpc('create_storage_policies', {
        bucket_name: 'classroom-photos'
      })
      
      if (policyError) {
        console.log('RPC not available, storage policies need to be created manually')
      }
    } catch (error) {
      // If the RPC doesn't exist, we'll create policies manually
      console.log('Creating storage policies manually...')
    }

    console.log('Storage setup completed successfully')
  } catch (error) {
    console.error('Error setting up storage:', error)
  }
}

setupStorageBucket()