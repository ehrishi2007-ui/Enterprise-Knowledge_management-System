-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own profile; admins read all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Documents: employees read docs for their dept or 'All'; admins read/write all
CREATE POLICY "Employees can read department documents" ON documents FOR SELECT
USING (
    'All' = ANY(allowed_departments) OR 
    (SELECT department FROM profiles WHERE id = auth.uid()) = ANY(allowed_departments) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can insert documents" ON documents FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update documents" ON documents FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete documents" ON documents FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Conversations: users CRUD own conversations only
CREATE POLICY "Users can manage own conversations" ON conversations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Chat Messages: users CRUD messages in own conversations
CREATE POLICY "Users can manage messages in own conversations" ON chat_messages FOR ALL
USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()));

-- Feedback: users create own feedback; admins read all
CREATE POLICY "Users can insert own feedback" ON feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback" ON feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback" ON feedback FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Settings: everyone reads; only admins write
CREATE POLICY "Everyone can read settings" ON settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings" ON settings FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Announcements: everyone reads; only admins create/delete
CREATE POLICY "Everyone can read announcements" ON announcements FOR SELECT
USING (true);

CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
