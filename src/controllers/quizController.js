const pool = require('../config/db');
const { customAlphabet } = require('nanoid');

const createQuiz = async (req, res) => {
    const { title, mode, questions } = req.body;
    const creator_id = req.user.id;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Invalid quiz data.' });
    }
    
    const quizMode = mode || 'self_paced_immediate';

    const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
    const code = nanoid();

    try {
        let quizId;
        
        // Try to insert with mode column
        try {
            const newQuizResult = await pool.query(
                'INSERT INTO quizzes (title, code, creator_id, mode) VALUES ($1, $2, $3, $4) RETURNING id',
                [title, code, creator_id, quizMode]
            );
            quizId = newQuizResult.rows[0].id;
        } catch (modeError) {
            // If mode column doesn't exist, insert without it
            console.log('Mode column not found, inserting without mode:', modeError.message);
            const newQuizResult = await pool.query(
                'INSERT INTO quizzes (title, code, creator_id) VALUES ($1, $2, $3) RETURNING id',
                [title, code, creator_id]
            );
            quizId = newQuizResult.rows[0].id;
        }

        for (const q of questions) {
            const { question_text, media_url, time_limit, variants } = q;
            const newQuestionResult = await pool.query(
                'INSERT INTO questions (quiz_id, question_text, media_url, time_limit) VALUES ($1, $2, $3, $4) RETURNING id',
                [quizId, question_text, media_url, time_limit]
            );
            const questionId = newQuestionResult.rows[0].id;

            for (const v of variants) {
                const { variant_text, is_correct } = v;
                await pool.query(
                    'INSERT INTO variants (question_id, variant_text, is_correct) VALUES ($1, $2, $3)',
                    [questionId, variant_text, is_correct]
                );
            }
        }

        res.status(201).json({ message: 'Quiz created successfully', code });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const { uploadFile } = require('../config/imagekit');

const uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        console.log('Uploading file:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        
        const fileName = `${Date.now()}_${req.file.originalname}`;
        const fileBuffer = req.file.buffer.toString('base64');
        
        console.log('File buffer length:', fileBuffer.length);
        
        const response = await uploadFile(fileBuffer, fileName, req.file.mimetype);
        
        console.log('ImageKit response:', response);
        
        res.json({ 
            url: response.url,
            fileId: response.fileId,
            name: response.name,
            fileType: response.fileType
        });
    } catch (error) {
        console.error('ImageKit upload error:', error);
        res.status(500).json({ 
            message: 'File upload failed.', 
            error: error.message,
            details: error.toString()
        });
    }
};

const goLive = async (req, res) => {
    const { quizId } = req.params;
    const creator_id = req.user.id;

    try {
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND creator_id = $2', [quizId, creator_id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found or you are not the creator.' });
        }

        await pool.query('UPDATE quizzes SET status = $1 WHERE id = $2', ['live', quizId]);

        res.json({ message: 'Quiz is now live.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const joinQuiz = async (req, res) => {
    const { code, username } = req.body;
    const userId = req.user?.id || null;

    if (!code || !username) {
        return res.status(400).json({ message: 'Please provide quiz code and username.' });
    }

    try {
        const quizResult = await pool.query('SELECT id, mode FROM quizzes WHERE code = $1 AND status = $2', [code, 'live']);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Live quiz not found with this code.' });
        }
        
        const quizId = quizResult.rows[0].id;
        const quizMode = quizResult.rows[0].mode;

        await pool.query(
            'INSERT INTO participants (quiz_id, username, user_id) VALUES ($1, $2, $3) ON CONFLICT (quiz_id, username) DO NOTHING',
            [quizId, username, userId]
        );

        res.json({ message: 'Joined quiz successfully.', quizId, mode: quizMode });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizQuestions = async (req, res) => {
    const { quizId } = req.params;

    try {
        const questionsResult = await pool.query(
            `SELECT q.id, q.question_text, q.media_url, q.time_limit, 
                    json_agg(json_build_object('id', v.id, 'variant_text', v.variant_text)) as variants
             FROM questions q
             JOIN variants v ON q.id = v.question_id
             WHERE q.quiz_id = $1
             GROUP BY q.id
             ORDER BY q.id`,
            [quizId]
        );

        if (questionsResult.rows.length === 0) {
            return res.status(404).json({ message: 'No questions found for this quiz.' });
        }

        res.json(questionsResult.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const submitAnswer = async (req, res) => {
    const { quizId, questionId, variantId, username, userId } = req.body;

    try {
        const variantResult = await pool.query('SELECT is_correct FROM variants WHERE id = $1', [variantId]);

        if (variantResult.rows.length === 0) {
            return res.status(404).json({ message: 'Variant not found.' });
        }

        const isCorrect = variantResult.rows[0].is_correct;

        res.json({ isCorrect });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const saveResult = async (req, res) => {
    const { quizId, score, username, userId } = req.body;

    try {
        await pool.query(
            'INSERT INTO results (quiz_id, user_id, guest_name, score) VALUES ($1, $2, $3, $4)',
            [quizId, userId || null, username, score]
        );

        res.json({ message: 'Result saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getLeaderboard = async (req, res) => {
    const { quizId } = req.params;

    try {
        const leaderboardResult = await pool.query(
            `SELECT r.score, COALESCE(u.username, r.guest_name) as username, r.created_at
             FROM results r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.quiz_id = $1
             ORDER BY r.score DESC, r.created_at ASC
             LIMIT 100`,
            [quizId]
        );

        res.json(leaderboardResult.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizByCode = async (req, res) => {
    const { code } = req.params;

    try {
        const quizResult = await pool.query('SELECT id, title, code, status FROM quizzes WHERE code = $1', [code]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        res.json(quizResult.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateQuiz = async (req, res) => {
    const { quizId } = req.params;
    const { title, questions } = req.body;
    const creator_id = req.user.id;

    try {
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND creator_id = $2', [quizId, creator_id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found or you are not the creator.' });
        }

        if (title) {
            await pool.query('UPDATE quizzes SET title = $1 WHERE id = $2', [title, quizId]);
        }

        if (questions && Array.isArray(questions)) {
            await pool.query('DELETE FROM questions WHERE quiz_id = $1', [quizId]);

            for (const q of questions) {
                const { question_text, media_url, time_limit, variants } = q;
                const newQuestionResult = await pool.query(
                    'INSERT INTO questions (quiz_id, question_text, media_url, time_limit) VALUES ($1, $2, $3, $4) RETURNING id',
                    [quizId, question_text, media_url, time_limit]
                );
                const questionId = newQuestionResult.rows[0].id;

                for (const v of variants) {
                    const { variant_text, is_correct } = v;
                    await pool.query(
                        'INSERT INTO variants (question_id, variant_text, is_correct) VALUES ($1, $2, $3)',
                        [questionId, variant_text, is_correct]
                    );
                }
            }
        }

        res.json({ message: 'Quiz updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMyQuizzes = async (req, res) => {
    const creator_id = req.user.id;

    try {
        const quizzesResult = await pool.query(
            'SELECT id, title, code, status, created_at FROM quizzes WHERE creator_id = $1 ORDER BY created_at DESC',
            [creator_id]
        );

        res.json(quizzesResult.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const stopLive = async (req, res) => {
    const { quizId } = req.params;
    const creator_id = req.user.id;

    try {
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND creator_id = $2', [quizId, creator_id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found or you are not the creator.' });
        }

        await pool.query('UPDATE quizzes SET status = $1 WHERE id = $2', ['pending', quizId]);

        res.json({ message: 'Quiz has been stopped.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuizById = async (req, res) => {
    const { quizId } = req.params;
    const creator_id = req.user.id;

    try {
        const quizResult = await pool.query(
            'SELECT id, title, code, status FROM quizzes WHERE id = $1 AND creator_id = $2',
            [quizId, creator_id]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        const questionsResult = await pool.query(
            `SELECT q.id, q.question_text, q.media_url, q.time_limit,
                    json_agg(json_build_object('id', v.id, 'variant_text', v.variant_text, 'is_correct', v.is_correct)) as variants
             FROM questions q
             LEFT JOIN variants v ON q.id = v.question_id
             WHERE q.quiz_id = $1
             GROUP BY q.id
             ORDER BY q.id`,
            [quizId]
        );

        res.json({
            quiz: quizResult.rows[0],
            questions: questionsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getParticipants = async (req, res) => {
    const { quizId } = req.params;
    
    try {
        const participants = await pool.query(
            'SELECT username, joined_at FROM participants WHERE quiz_id = $1 ORDER BY joined_at',
            [quizId]
        );
        res.json(participants.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const nextQuestionAdmin = async (req, res) => {
    const { quizId } = req.params;
    const creatorId = req.user.id;
    
    try {
        const quizCheck = await pool.query(
            'SELECT creator_id, current_question_index FROM quizzes WHERE id = $1',
            [quizId]
        );
        
        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        if (quizCheck.rows[0].creator_id !== creatorId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        const newIndex = quizCheck.rows[0].current_question_index + 1;
        
        await pool.query(
            'UPDATE quizzes SET current_question_index = $1 WHERE id = $2',
            [newIndex, quizId]
        );
        
        res.json({ message: 'Advanced to next question', questionIndex: newIndex });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const pauseQuiz = async (req, res) => {
    const { quizId } = req.params;
    const creatorId = req.user.id;
    
    try {
        const quizCheck = await pool.query(
            'SELECT creator_id FROM quizzes WHERE id = $1',
            [quizId]
        );
        
        if (quizCheck.rows.length === 0 || quizCheck.rows[0].creator_id !== creatorId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        await pool.query(
            'UPDATE quizzes SET is_paused = TRUE WHERE id = $1',
            [quizId]
        );
        
        res.json({ message: 'Quiz paused' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const resumeQuiz = async (req, res) => {
    const { quizId } = req.params;
    const creatorId = req.user.id;
    
    try {
        const quizCheck = await pool.query(
            'SELECT creator_id FROM quizzes WHERE id = $1',
            [quizId]
        );
        
        if (quizCheck.rows.length === 0 || quizCheck.rows[0].creator_id !== creatorId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        await pool.query(
            'UPDATE quizzes SET is_paused = FALSE WHERE id = $1',
            [quizId]
        );
        
        res.json({ message: 'Quiz resumed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createQuiz,
    uploadImage,
    goLive,
    joinQuiz,
    getQuizQuestions,
    submitAnswer,
    saveResult,
    getLeaderboard,
    getQuizByCode,
    updateQuiz,
    getMyQuizzes,
    stopLive,
    getQuizById,
    getParticipants,
    nextQuestionAdmin,
    pauseQuiz,
    resumeQuiz
};
