# Kahoot-like Quiz Application

Full-stack quiz platform with real-time features, image/video support, and presentation mode.

## Features

- 🎯 Admin & Student roles
- 🔴 Live quiz sessions
- 📊 Real-time leaderboard
- 🖼️ Image & Video support (ImageKit integration)
- 📺 Presentation mode with QR code
- ⏱️ Timed questions
- 🎨 Modern UI

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL (Neon)
- **Storage**: ImageKit
- **Auth**: JWT

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url
PORT=3000
```

## Local Development

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Start server
npm start
```

## Deploy to Render

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect `render.yaml`
6. Add environment variables:
   - `JWT_SECRET`
   - `IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`
   - `IMAGEKIT_URL_ENDPOINT`
7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)

### Render Database Setup

1. In Render Dashboard → "New +" → "PostgreSQL"
2. Name: `quiz-db`
3. Copy "External Database URL"
4. Add to your web service as `DATABASE_URL`
5. Run database init:
   ```bash
   # In Render Shell
   npm run db:init
   ```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel Dashboard:
# - DATABASE_URL
# - JWT_SECRET
# - IMAGEKIT_PUBLIC_KEY
# - IMAGEKIT_PRIVATE_KEY
# - IMAGEKIT_URL_ENDPOINT

# Production deploy
vercel --prod
```

### Vercel Database Setup

1. Use [Neon](https://neon.tech) or [Railway](https://railway.app) for PostgreSQL
2. Copy connection string
3. Add to Vercel environment variables
4. Deploy and visit `/api` to check

## Database Schema

- `users` - Authentication
- `quizzes` - Quiz management
- `questions` - Quiz questions
- `variants` - Answer options
- `results` - Quiz results & leaderboard

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Quizzes
- `GET /api/quizzes/my-quizzes` - Get user's quizzes
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes/code/:code` - Join quiz by code
- `PATCH /api/quizzes/:id/live` - Start quiz
- `PATCH /api/quizzes/:id/stop` - Stop quiz
- `GET /api/quizzes/:id/leaderboard` - Get leaderboard

### Upload
- `POST /api/quizzes/upload` - Upload media to ImageKit

## License

MIT
