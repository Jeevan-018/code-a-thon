---
description: how to run the project
---

To run the project locally, follow these steps:

### 1. Install Dependencies
You need to install dependencies for both the frontend and the backend.

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Setup Environment
Ensure you have a `.env` file in the `server` directory with your MongoDB URL:
`MONGO_URL=your_mongodb_connection_string`

### 3. Run Data Migration (First Time Only)
Populate your database with the initial set of questions:
// turbo
```bash
node server/scripts/migrate.js
```

### 4. Start the Project
You need to run the backend and frontend simultaneously. Open two terminal windows:

**Terminal 1: Backend**
// turbo
```bash
npm run server
```

**Terminal 2: Frontend**
// turbo
```bash
npm start
```

The application will be available at `http://localhost:3000`.
Admin credentials: `MCA@ADMIN` / `Admin@MCA`.
