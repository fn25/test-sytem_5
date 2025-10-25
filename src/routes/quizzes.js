const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post('/', [authMiddleware, adminMiddleware], quizController.createQuiz);

const upload = require('../middlewares/uploadMiddleware');

router.post('/upload', [authMiddleware, adminMiddleware, upload.single('file')], quizController.uploadImage);

router.patch('/:quizId/live', [authMiddleware, adminMiddleware], quizController.goLive);
router.patch('/:quizId/stop', [authMiddleware, adminMiddleware], quizController.stopLive);

router.post('/join', quizController.joinQuiz);

router.get('/:quizId/questions', quizController.getQuizQuestions);
router.get('/:quizId/details', [authMiddleware, adminMiddleware], quizController.getQuizById);
router.get('/code/:code', quizController.getQuizByCode);
router.put('/:quizId', [authMiddleware, adminMiddleware], quizController.updateQuiz);
router.get('/my-quizzes', [authMiddleware, adminMiddleware], quizController.getMyQuizzes);
router.post('/submit-answer', quizController.submitAnswer);
router.post('/save-result', quizController.saveResult);
router.get('/:quizId/leaderboard', quizController.getLeaderboard);
router.get('/:quizId/participants', quizController.getParticipants);
router.post('/:quizId/next', [authMiddleware, adminMiddleware], quizController.nextQuestionAdmin);
router.post('/:quizId/pause', [authMiddleware, adminMiddleware], quizController.pauseQuiz);
router.post('/:quizId/resume', [authMiddleware, adminMiddleware], quizController.resumeQuiz);

module.exports = router;
