DO $$ BEGIN
    CREATE TYPE quiz_mode AS ENUM ('synchronized', 'self_paced_immediate', 'self_paced_end');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE quizzes ADD COLUMN mode quiz_mode NOT NULL DEFAULT 'self_paced_immediate';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE quizzes ADD COLUMN current_question_index INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE quizzes ADD COLUMN is_paused BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE quizzes ADD COLUMN show_correct_answer BOOLEAN DEFAULT TRUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, username)
);
