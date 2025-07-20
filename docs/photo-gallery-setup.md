# Photo Gallery Setup for Classrooms

## Overview
The photo gallery feature allows users to upload, view, and manage photos for each classroom. Photos are stored in Supabase Storage and metadata is saved in the classrooms table.

## Database Changes
- Added `photos` column (JSONB) to the `classrooms` table
- Structure: `Array<{ url: string, caption: string, uploaded_at: string }>`

## Storage Bucket Setup
You need to create a storage bucket in Supabase Dashboard:

1. Go to Storage in your Supabase project
2. Create a new bucket with these settings:
   - **Name**: `classroom-photos`
   - **Public**: Yes (toggle on)
   - **File size limit**: 5MB
   - **Allowed MIME types**: 
     - image/jpeg
     - image/png
     - image/webp
     - image/gif

3. Set up RLS policies for the bucket:
   - Allow authenticated users to SELECT (view)
   - Allow authenticated users to INSERT (upload)
   - Allow authenticated users to UPDATE (modify)
   - Allow authenticated users to DELETE (remove)

## Components Created

### 1. PhotoUpload Component (`/src/components/ui/photo-upload.tsx`)
- Handles file upload to Supabase Storage
- Manages photo captions
- Allows deletion of photos
- Shows upload progress

### 2. PhotoGallery Component (`/src/components/classrooms/photo-gallery.tsx`)
- Displays photos in a grid layout
- Lightbox view for full-size images
- Navigation between photos
- Shows captions

### 3. ClassroomDetailsDialog Component (`/src/components/classrooms/classroom-details-dialog.tsx`)
- Shows detailed classroom information
- Includes tabs for:
  - Basic information
  - Photo gallery
  - Equipment list

## Updated Components

### ClassroomDialog
- Added photos tab for uploading/managing photos
- Photos are saved with classroom data

### Classrooms Page
- Added "View Details" button (eye icon) to see classroom details with photos
- Photos are loaded with classroom data

## Usage

### Uploading Photos
1. Edit a classroom or create a new one
2. Go to the "Fotos" tab
3. Click "Pujar fotos" and select images
4. Add captions to photos (optional)
5. Save the classroom

### Viewing Photos
1. Click the eye icon on any classroom in the list
2. Go to the "Fotos" tab in the details dialog
3. Click on any photo to view in full size
4. Navigate between photos using arrow buttons

## File Structure
```
/classrooms/{classroom_code}/{filename}
```

Files are organized by classroom code for easy management.