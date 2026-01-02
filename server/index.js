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

// ✅ Define Result Schema
const resultSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, index: true },
  answers: { type: Object, default: {} },
  warningCount: { type: Number, default: 0 },
  code: { type: String, default: "" },
  language: { type: String, default: "" },
  section: { type: String, required: true },
  disqualified: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  sectionsCompleted: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
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
    const { candidateId, section, answers, code, language, score, disqualified, warningCount } = req.body;
    
    if (!candidateId || !section) {
      return res.status(400).json({ error: "candidateId and section are required" });
    }

    // Find existing result for this candidate
    let result = await Result.findOne({ candidateId });

    if (result) {
      // Update existing result
      if (answers) {
        result.answers = { ...result.answers, ...answers };
      }
      if (code) {
        result.code = code;
      }
      if (language) {
        result.language = language;
      }
      if (score !== undefined) {
        // Update section-specific score
        if (!result.answers.sectionScores) {
          result.answers.sectionScores = {};
        }
        result.answers.sectionScores[section] = score;
        
        // Calculate total score
        const sectionScores = result.answers.sectionScores || {};
        result.totalScore = Object.values(sectionScores).reduce((sum, s) => sum + (s || 0), 0);
      }
      if (disqualified !== undefined) {
        result.disqualified = disqualified;
      }
      if (warningCount !== undefined) {
        result.warningCount = Math.max(result.warningCount || 0, warningCount);
      }
      if (!result.sectionsCompleted.includes(section)) {
        result.sectionsCompleted.push(section);
      }
      result.updatedAt = Date.now();
      await result.save();
    } else {
      // Create new result
      const sectionScores = {};
      if (score !== undefined) {
        sectionScores[section] = score;
      }
      
      result = new Result({
        candidateId,
        answers: { ...answers, sectionScores },
        code: code || "",
        language: language || "",
        section,
        disqualified: disqualified || false,
        warningCount: warningCount || 0,
        score: score || 0,
        totalScore: score || 0,
        sectionsCompleted: [section],
      });
      await result.save();
    }

    console.log(`✅ Result saved for candidate ${candidateId}, section ${section}`);
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
