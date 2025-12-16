-- Quiz Tracking Setup
-- This script adds quiz attempt tracking to the database

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL, -- Stores the answers as {"1": "B", "2": "C", ...}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT quiz_attempts_score_check CHECK (score >= 0 AND score <= 100),
  CONSTRAINT quiz_attempts_correct_check CHECK (correct_answers >= 0),
  CONSTRAINT quiz_attempts_total_check CHECK (total_questions > 0)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own quiz attempts
CREATE POLICY "Users can view their own quiz attempts"
  ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own quiz attempts
CREATE POLICY "Users can insert their own quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all quiz attempts
CREATE POLICY "Admins can view all quiz attempts"
  ON public.quiz_attempts
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;

