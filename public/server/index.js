import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define schemas
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

const credentialSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "" },
});

const Credential = mongoose.model("Credential", credentialSchema);

async function seedCredentials() {
  try {
    const count = await Credential.countDocuments();
    if (count === 0) {
      await Credential.insertMany([
        { candidateId: "candidate1", password: "password123", name: "Candidate One" },
        { candidateId: "candidate2", password: "password123", name: "Candidate Two" },
        { candidateId: "candidate3", password: "password123", name: "Candidate Three" },
        { candidateId: "admin", password: "admin123", name: "Administrator" },
      ]);
      console.log("✅ Seeded default login credentials");
    }
  } catch (err) {
    console.error("❌ Failed to seed credentials:", err);
  }
}

seedCredentials();

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

    const credential = await Credential.findOne({ candidateId });
    if (!credential || credential.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      candidate: {
        id: credential.candidateId,
        name: credential.name || credential.candidateId,
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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


