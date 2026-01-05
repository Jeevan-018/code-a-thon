import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREDENTIALS_FILE = path.join(__dirname, "credentials.json");

// ✅ Connect MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define User Schema
const userSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
});
const User = mongoose.model("User", userSchema);

// ✅ Define Submission Schema (EVERY CODE RUN)
const submissionSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, index: true },
  questionId: { type: String },
  section: { type: String, required: true },
  language: { type: String },
  code: { type: String },
  score: { type: Number, default: 0 },
  output: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Submission = mongoose.model("Submission", submissionSchema);

// ✅ Define Result Schema (AGGREGATED SUMMARY)
const resultSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  answers: { type: Object, default: {} },
  warningCount: { type: Number, default: 0 },
  disqualified: { type: Boolean, default: false },
  totalScore: { type: Number, default: 0 },
  sectionsCompleted: { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now },
});
const Result = mongoose.model("Result", resultSchema);

// ✅ Seed Users / Migrate from File
async function seedUsers() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("ℹ️ No users found in MongoDB. Attempting migration...");
      let usersToSeed = [];

      // Try reading from file
      if (fs.existsSync(CREDENTIALS_FILE)) {
        try {
          const fileData = fs.readFileSync(CREDENTIALS_FILE, "utf8");
          const fileUsers = JSON.parse(fileData);
          if (Array.isArray(fileUsers)) {
            usersToSeed = fileUsers;
            console.log(`✅ Found ${usersToSeed.length} users in credentials.json`);
          }
        } catch (fileErr) {
          console.error("⚠️ Error reading credentials.json:", fileErr.message);
        }
      }

      // If no file users, use default admin
      if (usersToSeed.length === 0) {
        usersToSeed.push({
          candidateId: "MCA@ADMIN",
          password: process.env.ADMIN_PASSWORD || "Admin@MCA",
          name: "MCA Admin",
        });
        console.log("ℹ️ Using default admin credentials.");
      }

      await User.insertMany(usersToSeed);
      console.log("✅ Users successfully migrated to MongoDB.");
    } else {
      console.log("✅ Users already exist in MongoDB.");
    }
  } catch (err) {
    console.error("❌ Failed to seed users:", err);
  }
}

seedUsers();

// ✅ API route to store/update results
app.post("/api/submit", async (req, res) => {
  try {
    const { candidateId, section, questionId, answers, code, language, score, disqualified, warningCount, output } = req.body;
    
    console.log("📩 Incoming submission:", req.body);
    
    if (!candidateId || !section) {
      return res.status(400).json({ error: "candidateId and section are required" });
    }

    // 1️⃣ Save submission (Per-run record)
    await Submission.create({
      candidateId,
      questionId,
      section,
      language,
      code,
      score: score || 0,
      output
    });

    // 2️⃣ Update summary safely (Aggregated)
    let updateOps = {
      $set: { updatedAt: new Date() }
    };

    if (disqualified !== undefined) {
      updateOps.$set.disqualified = disqualified;
    }

    if (warningCount !== undefined) {
      updateOps.$set.warningCount = warningCount;
    }

    if (answers) {
      // For MCQ sections, we might want to store specific answers
      updateOps.$set[`answers.${section}`] = answers;
    }

    // Special handling for scores
    if (score !== undefined) {
      updateOps.$set[`answers.sectionScores.${section}`] = score;
    }

    // Add section to completed list if not already there
    updateOps.$addToSet = { sectionsCompleted: section };

    const result = await Result.findOneAndUpdate(
      { candidateId },
      updateOps,
      { upsert: true, new: true }
    );

    // Recalculate total score
    const sectionScores = result.answers?.sectionScores || {};
    result.totalScore = Object.values(sectionScores).reduce((sum, s) => sum + (s || 0), 0);
    await result.save();

    console.log(`✅ Result updated for candidate ${candidateId}, section ${section}`);
    res.status(200).json({ 
      message: "Result saved successfully",
      totalScore: result.totalScore,
      sectionsCompleted: result.sectionsCompleted
    });
  } catch (err) {
    console.error("❌ Error saving result:", err);
    res.status(500).json({ error: "Failed to save result", details: err.message });
  }
});

// ✅ Login route
app.post("/api/login", async (req, res) => {
  try {
    const { candidateId, password } = req.body;

    if (!candidateId || !password) {
      return res
        .status(400)
        .json({ error: "candidateId and password are required" });
    }

    // Find user in MongoDB
    const user = await User.findOne({ candidateId });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      candidate: {
        id: user.candidateId,
        name: user.name || user.candidateId,
      },
    });
  } catch (err) {
    console.error("❌ Login failed:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ✅ Get all results (for admin/viewing results)
app.get("/api/results", async (req, res) => {
  try {
    const results = await Result.find().sort({ totalScore: -1, timestamp: 1 });
    res.status(200).json(results);
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// ✅ Get result by candidate ID
app.get("/api/results/:candidateId", async (req, res) => {
  try {
    const result = await Result.findOne({ candidateId: req.params.candidateId });
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching result:", err);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Server running successfully");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
