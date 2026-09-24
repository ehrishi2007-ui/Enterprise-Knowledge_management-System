-- Drop hardcoded role check constraint on profiles to allow flexible roles
-- (e.g. employee, lecturer, student, staff, admin, etc.)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
