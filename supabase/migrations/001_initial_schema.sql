-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Complete schema, constraints, indexes, triggers, and Row Level
--              Security (RLS) policies for AI-Powered Student Progress Tracker.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS

-- Function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. PROFILES TABLE
-- Stores student profile information linked directly to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    academic_level TEXT,
    institution_name TEXT,
    target_percentage NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_target_percentage_range CHECK (target_percentage IS NULL OR (target_percentage >= 0.00 AND target_percentage <= 100.00)),
    CONSTRAINT chk_display_name_len CHECK (display_name IS NULL OR (length(trim(display_name)) > 0 AND length(display_name) <= 100)),
    CONSTRAINT chk_academic_level_len CHECK (academic_level IS NULL OR length(academic_level) <= 100),
    CONSTRAINT chk_institution_name_len CHECK (institution_name IS NULL OR length(institution_name) <= 150)
);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-provision profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_display_name TEXT;
    v_academic_level TEXT;
    v_institution_name TEXT;
BEGIN
    -- Safely extract optional metadata if provided during sign up
    IF NEW.raw_user_meta_data IS NOT NULL THEN
        v_display_name := SUBSTRING(TRIM(NEW.raw_user_meta_data->>'display_name') FROM 1 FOR 100);
        v_academic_level := SUBSTRING(TRIM(NEW.raw_user_meta_data->>'academic_level') FROM 1 FOR 100);
        v_institution_name := SUBSTRING(TRIM(NEW.raw_user_meta_data->>'institution_name') FROM 1 FOR 150);
    END IF;

    -- If no display name provided, default to the part before @ in email or 'Student'
    IF v_display_name IS NULL OR v_display_name = '' THEN
        IF NEW.email IS NOT NULL AND POSITION('@' IN NEW.email) > 1 THEN
            v_display_name := SPLIT_PART(NEW.email, '@', 1);
        ELSE
            v_display_name := 'Student';
        END IF;
    END IF;

    INSERT INTO public.profiles (id, display_name, academic_level, institution_name, target_percentage)
    VALUES (NEW.id, v_display_name, v_academic_level, v_institution_name, 85.00)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure auth signup is never aborted due to non-critical profile defaults
        RAISE WARNING 'handle_new_user failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. SUBJECTS TABLE
-- Stores academic subjects managed by students
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject_code TEXT,
    description TEXT,
    target_percentage NUMERIC(5,2),
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_subject_name_not_blank CHECK (length(trim(name)) > 0 AND length(name) <= 100),
    CONSTRAINT chk_subject_code_len CHECK (subject_code IS NULL OR length(subject_code) <= 30),
    CONSTRAINT chk_description_len CHECK (description IS NULL OR length(description) <= 500),
    CONSTRAINT chk_subject_target_pct CHECK (target_percentage IS NULL OR (target_percentage >= 0.00 AND target_percentage <= 100.00)),
    CONSTRAINT chk_color_palette CHECK (color IS NULL OR color IN (
        'indigo', 'blue', 'cyan', 'teal', 'emerald', 'green', 'amber', 'orange', 'rose', 'purple', 'slate'
    ))
);

-- Case-insensitive unique subject name per user (after trimming whitespace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_user_unique_name 
    ON public.subjects (user_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_subjects_user_id 
    ON public.subjects (user_id);

CREATE INDEX IF NOT EXISTS idx_subjects_user_created 
    ON public.subjects (user_id, created_at DESC);

-- Trigger for subjects updated_at
DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. ASSESSMENTS TABLE
-- Stores individual tests, quizzes, assignments, and exam marks
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    assessment_date DATE NOT NULL,
    marks_obtained NUMERIC(10,2) NOT NULL,
    max_marks NUMERIC(10,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_assessment_title CHECK (length(trim(title)) > 0 AND length(title) <= 150),
    CONSTRAINT chk_assessment_type CHECK (assessment_type IN (
        'Quiz', 'Assignment', 'Unit Test', 'Midterm Examination', 'Final Examination', 'Practical', 'Project', 'Other'
    )),
    CONSTRAINT chk_marks_obtained_non_negative CHECK (marks_obtained >= 0.00),
    CONSTRAINT chk_max_marks_positive CHECK (max_marks > 0.00),
    CONSTRAINT chk_marks_obtained_lte_max CHECK (marks_obtained <= max_marks),
    CONSTRAINT chk_remarks_len CHECK (remarks IS NULL OR length(remarks) <= 1000)
);

-- Database-level referential security: verify subject belongs to the assessment's user_id
CREATE OR REPLACE FUNCTION public.validate_assessment_subject_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subject_user_id UUID;
BEGIN
    SELECT user_id INTO v_subject_user_id
    FROM public.subjects
    WHERE id = NEW.subject_id;

    IF v_subject_user_id IS NULL THEN
        RAISE EXCEPTION 'Referenced subject does not exist.';
    END IF;

    IF v_subject_user_id <> NEW.user_id THEN
        RAISE EXCEPTION 'Cross-tenant assignment: The selected subject does not belong to the authenticated user.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_assessment_subject_owner ON public.assessments;
CREATE TRIGGER trg_validate_assessment_subject_owner
    BEFORE INSERT OR UPDATE OF subject_id, user_id ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_assessment_subject_owner();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_user_id 
    ON public.assessments (user_id);

CREATE INDEX IF NOT EXISTS idx_assessments_subject_id 
    ON public.assessments (subject_id);

CREATE INDEX IF NOT EXISTS idx_assessments_date 
    ON public.assessments (assessment_date);

CREATE INDEX IF NOT EXISTS idx_assessments_user_date 
    ON public.assessments (user_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_user_subject_date 
    ON public.assessments (user_id, subject_id, assessment_date DESC);

-- Trigger for assessments updated_at
DROP TRIGGER IF EXISTS trg_assessments_updated_at ON public.assessments;
CREATE TRIGGER trg_assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. STUDY PLANS TABLE
-- Stores personalized AI-generated or custom student study schedules
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    tasks JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_study_plan_title CHECK (length(trim(title)) > 0 AND length(title) <= 150),
    CONSTRAINT chk_study_plan_desc CHECK (description IS NULL OR length(description) <= 2000),
    CONSTRAINT chk_study_plan_date_order CHECK (end_date >= start_date),
    CONSTRAINT chk_study_plan_status CHECK (status IN ('active', 'completed', 'archived')),
    CONSTRAINT chk_study_plan_tasks_array CHECK (jsonb_typeof(tasks) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id 
    ON public.study_plans (user_id);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_status 
    ON public.study_plans (user_id, status);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_dates 
    ON public.study_plans (user_id, start_date DESC, end_date DESC);

-- Trigger for study_plans updated_at
DROP TRIGGER IF EXISTS trg_study_plans_updated_at ON public.study_plans;
CREATE TRIGGER trg_study_plans_updated_at
    BEFORE UPDATE ON public.study_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict data isolation ensuring students can only access and modify their own records.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 7.2 SUBJECTS POLICIES
DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
CREATE POLICY "Users can view own subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own subjects" ON public.subjects;
CREATE POLICY "Users can create own subjects"
    ON public.subjects FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
CREATE POLICY "Users can update own subjects"
    ON public.subjects FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;
CREATE POLICY "Users can delete own subjects"
    ON public.subjects FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 7.3 ASSESSMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own assessments" ON public.assessments;
CREATE POLICY "Users can view own assessments"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own assessments" ON public.assessments;
CREATE POLICY "Users can create own assessments"
    ON public.assessments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assessments" ON public.assessments;
CREATE POLICY "Users can update own assessments"
    ON public.assessments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own assessments" ON public.assessments;
CREATE POLICY "Users can delete own assessments"
    ON public.assessments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 7.4 STUDY PLANS POLICIES
DROP POLICY IF EXISTS "Users can view own study plans" ON public.study_plans;
CREATE POLICY "Users can view own study plans"
    ON public.study_plans FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own study plans" ON public.study_plans;
CREATE POLICY "Users can create own study plans"
    ON public.study_plans FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study plans" ON public.study_plans;
CREATE POLICY "Users can update own study plans"
    ON public.study_plans FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own study plans" ON public.study_plans;
CREATE POLICY "Users can delete own study plans"
    ON public.study_plans FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 8. PERMISSIONS & ROLE GRANTS
-- Grant necessary table access to authenticated and service_role; revoke from anon
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.subjects FROM anon;
REVOKE ALL ON TABLE public.assessments FROM anon;
REVOKE ALL ON TABLE public.study_plans FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_plans TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.subjects TO service_role;
GRANT ALL ON TABLE public.assessments TO service_role;
GRANT ALL ON TABLE public.study_plans TO service_role;
