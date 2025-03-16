require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();

// Middleware Configuration
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukul:1010@nodecluster0.hurza.mongodb.net/interviewDB?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  dbName:"AiInterview",
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// Interview Schema
// const interviewSchema = new mongoose.Schema({
//   hrQuestion: { type: String, required: true },
//   candidateAnswer: { type: String, required: true },
//   interviewField: { type: String, required: true, enum: ['SDE', 'Business', 'Manager', 'HR'] },
//   timestamp: { type: Date, default: Date.now }
// });

// Modify the Interview Schema
const interviewSchema = new mongoose.Schema({
    interviewField: { 
      type: String, 
      required: true, 
      enum: ['SDE', 'Business', 'Manager', 'HR'] 
    },
    qaPairs: [{
      hrQuestion: String,
      candidateAnswer: String
    }],
    timestamp: { type: Date, default: Date.now }
  });


const Interview = mongoose.model("Interview", interviewSchema);

// File Upload Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// API Routes (MUST come before static files)
app.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    
    const questions = pdfData.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, '')}`);

    res.json({ 
      success: true,
      questions
    });

  } catch (error) {
    console.error("PDF processing error:", error);
    res.status(500).json({ 
      error: "Failed to process PDF file",
      details: error.message 
    });
  }
});

// app.post("/api/save-interview", async (req, res) => {
//   try {
//     const { hrQuestion, candidateAnswer, interviewField } = req.body;

//     if (!hrQuestion || !candidateAnswer || !interviewField) {
//       return res.status(400).json({
//         error: "Missing required fields",
//         required: ["hrQuestion", "candidateAnswer", "interviewField"]
//       });
//     }

//     const newInterview = new Interview({
//       hrQuestion,
//       candidateAnswer,
//       interviewField
//     });

//     const savedInterview = await newInterview.save();
//     res.status(201).json(savedInterview);

//   } catch (error) {
//     console.error("Save error:", error);
//     res.status(500).json({
//       error: "Failed to save interview data",
//       details: error.message
//     });
//   }
// });


// Update the save endpoint
app.post("/api/save-interview", async (req, res) => {
    try {
      const { interviewField, qaPairs } = req.body;
  
      if (!interviewField || !qaPairs || !Array.isArray(qaPairs)) {
        return res.status(400).json({
          error: "Missing required fields",
          required: ["interviewField", "qaPairs"]
        });
      }
  
      const newInterview = new Interview({
        interviewField,
        qaPairs
      });
  
      const savedInterview = await newInterview.save();
      res.status(201).json(savedInterview);
  
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({
        error: "Failed to save interview data",
        details: error.message
      });
    }
  });


// Static Files (AFTER API routes)
app.use(express.static(path.join(__dirname, "public")));

// Catch-all Route (MUST be last)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

// Server Startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});