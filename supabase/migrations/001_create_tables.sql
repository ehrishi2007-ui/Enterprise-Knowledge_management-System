-- profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
    department TEXT CHECK (department IN ('HR','Engineering','Finance','Legal','Operations')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- documents
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt')),
    file_size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    department TEXT,
    tags TEXT[] DEFAULT '{}',
    uploaded_by UUID REFERENCES auth.users(id),
    allowed_departments TEXT[] DEFAULT '{All}',
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed')),
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- conversations
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Chat',
    is_bookmarked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- chat_messages
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    response_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- feedback
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    rating TEXT CHECK (rating IN ('helpful', 'not_helpful')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- settings (key-value for AI config)
CREATE TABLE settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- announcements
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_documents_department ON documents(department);

-- Full-text search for documents
ALTER TABLE documents ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(filename, ''))) STORED;
CREATE INDEX idx_documents_fts ON documents USING GIN (fts);

-- Default settings
INSERT INTO settings (key, value) VALUES 
('system_prompt', 'You are an enterprise knowledge assistant. Answer based on the provided sources.'),
('temperature', '0.3'),
('max_tokens', '512'),
('top_k', '5'),
('citation_format', '[DocName, Page X]')
ON CONFLICT (key) DO NOTHING;
