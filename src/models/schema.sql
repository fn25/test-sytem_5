DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS quiz_status CASCADE;
DROP TYPE IF EXISTS quiz_mode CASCADE;

CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE quiz_status AS ENUM ('pending', 'live', 'finished');
CREATE TYPE quiz_mode AS ENUM ('synchronized', 'self_paced_immediate', 'self_paced_end');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    creator_id INTEGER REFERENCES users(id),
    status quiz_status NOT NULL DEFAULT 'pending',
    mode quiz_mode NOT NULL DEFAULT 'self_paced_immediate',
    current_question_index INTEGER DEFAULT 0,
    is_paused BOOLEAN DEFAULT FALSE,
    show_correct_answer BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    media_url TEXT,
    time_limit INTEGER DEFAULT 30
);

CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    variant_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    guest_name VARCHAR(255),
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, username)
);
