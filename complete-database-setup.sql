-- Complete Database Setup Script for Ohio Roofing Training
-- Run this entire script in your Supabase SQL Editor
-- This ensures all tables, functions, policies, and triggers are properly set up

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'trainee' CHECK (role IN ('trainee', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. IS_ADMIN FUNCTION (Required for admin policies)
-- ============================================================================

-- Create a function to check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 3. AUTO-CREATE USER PROFILE TRIGGER
-- ============================================================================

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (NEW.id, NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    'trainee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. QUIZ ATTEMPTS TABLE
-- ============================================================================

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.quiz_attempts;

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

-- ============================================================================
-- 5. LEADERBOARD EARNINGS TABLE
-- ============================================================================

-- Create leaderboard_earnings table
CREATE TABLE IF NOT EXISTS public.leaderboard_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2024-01')
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id), -- Admin who updated this
  CONSTRAINT leaderboard_earnings_amount_check CHECK (amount >= 0),
  CONSTRAINT leaderboard_earnings_month_year_format CHECK (month_year ~ '^\d{4}-\d{2}$'),
  UNIQUE(user_id, month_year) -- One entry per user per month
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_earnings_user_id ON public.leaderboard_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_earnings_month_year ON public.leaderboard_earnings(month_year DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_earnings_amount ON public.leaderboard_earnings(month_year, amount DESC);

-- Enable Row Level Security
ALTER TABLE public.leaderboard_earnings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own earnings" ON public.leaderboard_earnings;
DROP POLICY IF EXISTS "Users can view current month leaderboard" ON public.leaderboard_earnings;
DROP POLICY IF EXISTS "Admins can view all earnings" ON public.leaderboard_earnings;
DROP POLICY IF EXISTS "Admins can insert earnings" ON public.leaderboard_earnings;
DROP POLICY IF EXISTS "Admins can update earnings" ON public.leaderboard_earnings;

-- Policy: Users can view their own earnings
CREATE POLICY "Users can view their own earnings"
  ON public.leaderboard_earnings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view all earnings for current month (for leaderboard)
CREATE POLICY "Users can view current month leaderboard"
  ON public.leaderboard_earnings
  FOR SELECT
  USING (
    month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  );

-- Policy: Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
  ON public.leaderboard_earnings
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Policy: Admins can insert earnings
CREATE POLICY "Admins can insert earnings"
  ON public.leaderboard_earnings
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy: Admins can update earnings
CREATE POLICY "Admins can update earnings"
  ON public.leaderboard_earnings
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.leaderboard_earnings TO authenticated;

-- Function to get or create current month entry for a user
CREATE OR REPLACE FUNCTION public.get_or_create_leaderboard_entry(
  p_user_id UUID,
  p_amount DECIMAL DEFAULT 0.00
)
RETURNS UUID AS $$
DECLARE
  v_month_year TEXT;
  v_entry_id UUID;
BEGIN
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Try to get existing entry
  SELECT id INTO v_entry_id
  FROM public.leaderboard_earnings
  WHERE user_id = p_user_id AND month_year = v_month_year;
  
  -- If no entry exists, create one
  IF v_entry_id IS NULL THEN
    INSERT INTO public.leaderboard_earnings (user_id, amount, month_year, updated_by)
    VALUES (p_user_id, p_amount, v_month_year, auth.uid())
    RETURNING id INTO v_entry_id;
  END IF;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. DELETE USER FUNCTION
-- ============================================================================

-- Function to delete a user from both user_profiles and auth.users
-- This function requires admin privileges and uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.delete_user(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Prevent deleting yourself
  IF user_id_to_delete = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- Delete from user_profiles first (cascade will handle related data)
  DELETE FROM public.user_profiles WHERE id = user_id_to_delete;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin)
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- All tables, functions, policies, and triggers have been created.
-- Your database is now ready to use!

