-- Migration to add language support to existing quizzes table

-- Step 1: Create the quiz_language enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_language') THEN
        CREATE TYPE quiz_language AS ENUM ('uz', 'ru', 'en');
    END IF;
END $$;

-- Step 2: Add the language column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'language'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN language quiz_language NOT NULL DEFAULT 'uz';
    END IF;
END $$;
