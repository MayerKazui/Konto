-- Create Savings Goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    deadline DATE,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Create Policy for Insert
CREATE POLICY "Users can insert their own savings goals"
ON savings_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create Policy for Select
CREATE POLICY "Users can view their own savings goals"
ON savings_goals FOR SELECT
USING (auth.uid() = user_id);

-- Create Policy for Update
CREATE POLICY "Users can update their own savings goals"
ON savings_goals FOR UPDATE
USING (auth.uid() = user_id);

-- Create Policy for Delete
CREATE POLICY "Users can delete their own savings goals"
ON savings_goals FOR DELETE
USING (auth.uid() = user_id);
