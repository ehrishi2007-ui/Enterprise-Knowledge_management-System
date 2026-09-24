-- Migration 007: Add allowed_roles to documents and create roles & permissions table

-- 1. Add allowed_roles to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS allowed_roles TEXT[] DEFAULT '{All}';

-- 2. Create roles and permissions table for custom role management
CREATE TABLE IF NOT EXISTS role_permissions (
    role_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    can_upload BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_manage_departments BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    color TEXT DEFAULT 'teal',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Seed default roles and their permissions
INSERT INTO role_permissions (role_name, display_name, description, can_upload, can_delete, can_manage_users, can_manage_departments, can_manage_settings, is_custom, color)
VALUES
    ('admin', 'Administrator', 'Full institutional and administrative access', true, true, true, true, true, false, 'teal'),
    ('lecturer', 'Lecturer / Faculty', 'Academic faculty with document publishing rights', true, false, false, false, false, false, 'purple'),
    ('student', 'Student', 'Student access to learning materials and query assistant', false, false, false, false, false, false, 'blue'),
    ('employee', 'Employee / Staff', 'General institutional staff member', false, false, false, false, false, false, 'emerald'),
    ('staff', 'Support Staff', 'Departmental support staff with upload access', true, false, false, false, false, false, 'orange')
ON CONFLICT (role_name) DO NOTHING;
