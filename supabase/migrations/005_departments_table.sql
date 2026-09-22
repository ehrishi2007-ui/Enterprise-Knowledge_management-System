-- Create departments table for dynamic department management
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#599692',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Remove hardcoded CHECK constraint on profiles.department if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_department_check;

-- Seed default departments
INSERT INTO departments (name, color) VALUES
    ('HR', '#f97316'),
    ('Engineering', '#3b82f6'),
    ('Finance', '#22c55e'),
    ('Legal', '#a855f7'),
    ('Operations', '#06b6d4')
ON CONFLICT (name) DO NOTHING;
