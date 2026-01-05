# Code-A-Thon Assessment Platform

A robust, real-time coding assessment platform built with React, Node.js, and MongoDB.

## 🚀 Features
- **Secure Exam Interface**: Prevents cheating via fullscreen mode and tab-switching detection.
- **Dynamic Scoring**: Automatically calculates scores for MCQs and Code submissions.
- **Real-time Evaluation**: Integrated with the Piston API for instant code feedback.
- **Admin Dashboard**: Visualize candidate performance with interactive charts and export results to CSV.
- **Data Persistence**: Every code submission is recorded, ensuring a full audit trail.

## 🛠️ Tech Stack
- **Frontend**: React, Monaco Editor, Recharts, Axios
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB Atlas

## 📦 Setup & Installation

### Backend
1. Navigate to `/server`.
2. Install dependencies: `npm install`.
3. Configure `.env` with `MONGO_URL` and `PORT`.
4. Start server: `node index.js`.

### Frontend
1. In the root directory, install dependencies: `npm install`.
2. Configure environment variables in `.env` (API URL).
3. Start the app: `npm start`.

---
*Created for the Code-A-Thon Project.*
