-- Add content_type column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text_only' 
CHECK (content_type IN ('text_only', 'images_only', 'combination'));
