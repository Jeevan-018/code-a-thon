import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const ROOT_DIR = path.join(__dirname, "..", "..");

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ MONGO_URL not found in .env");
  process.exit(1);
}

// Reuse schemas from index.js (roughly defined here for the script)
const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String },
  choices: [String],
  answer: { type: Number },
  problemStatement: { type: String },
  supportedLanguages: [String],
  testCases: [
    {
      input: { type: String },
      expectedOutput: { type: String },
      isVisible: { type: Boolean, default: true },
    },
  ],
  marks: { type: Number, default: 1 },
  type: { type: String, enum: ["MCQ", "CODING"], required: true },
});

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  description: { type: String },
  questions: [questionSchema],
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  sections: [sectionSchema],
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Exam = mongoose.model("Exam", examSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB Connected for Migration");

    const existingExam = await Exam.findOne({ title: "Internal Assessment 2024" });
    if (existingExam) {
      console.log("⚠️ Migration already performed or Exam with this title exists.");
      process.exit(0);
    }

    const sectionAFiles = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "public", "questions", "sectionA.json"), "utf8"));
    const sectionBFiles = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "public", "questions", "sectionB.json"), "utf8"));
    const sectionCFiles = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "public", "questions", "sectionC.json"), "utf8"));

    const sections = [
      {
        id: "A",
        name: "Verbal Ability",
        duration: 30 * 60,
        description: "Multiple choice questions on verbal reasoning and language skills",
        questions: sectionAFiles.map(q => ({ ...q, type: "MCQ" }))
      },
      {
        id: "B",
        name: "Numerical Ability",
        duration: 20 * 60,
        description: "Multiple choice questions on numerical reasoning and problem solving",
        questions: sectionBFiles.map(q => ({ ...q, type: "MCQ" }))
      },
      {
        id: "C",
        name: "Logical Ability",
        duration: 60 * 60,
        description: "Coding problems to test logical thinking and programming skills",
        questions: sectionCFiles.map(q => ({
          id: q.id,
          problemStatement: q.text, // Mapping existing 'text' to 'problemStatement'
          testCases: q.testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isVisible: true
          })),
          type: "CODING",
          supportedLanguages: ["Python", "Java", "C", "C++"]
        }))
      }
    ];

    await Exam.create({
      title: "Internal Assessment 2024",
      description: "Migrated from static JSON files",
      sections: sections,
      isActive: true
    });

    console.log("✅ Migration Successful!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Failed:", err);
    process.exit(1);
  }
}

migrate();
