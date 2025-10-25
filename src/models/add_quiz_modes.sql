
DROP TYPE IF EXISTS quiz_mode CASCADE;
CREATE TYPE quiz_mode AS ENUM ('synchronized', 'self_paced_immediate', 'self_paced_end');

ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS mode quiz_mode NOT NULL DEFAULT 'self_paced_immediate',
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_correct_answer BOOLEAN DEFAULT TRUE;


CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, username)
);
