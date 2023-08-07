const express = require('express')
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Student = require('./Models/student')
const Exam =require('./Models/exam')
const app = express()
const port = 3000
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'youremai',
      pass: 'yourpassword'
    }
  });
main().catch(err => console.log(err));
app.use(cors());
app.use(bodyParser.json());
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/studentdb');
  }
  async function sendMarkSheetByEmail(parentEmail, markSheet) {
    const mailOptions = {
      from: 'youremail',
      to: parentEmail,
      subject: 'Mark Sheet',
      html: `<p>mark sheet for your child:</p><pre>${JSON.stringify(markSheet, null, 2)}</pre>`
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log('Mark sheet sent successfully');
    } catch (error) {
      console.error('Error sending mark sheet:', error);
    }
  }
  
  function cGrade(score) {
    if (score >= 9) {
      return 'A';
    } else if (score >= 8) {
      return 'B';
    } else if (score >= 7) {
      return 'C';
    } else if (score >= 6) {
      return 'D';
    } else {
      return 'F';
    }
  }
app.post('/upload-student-data',async (req,res)=>{
    try {
        const studentList=req.body;
        const saveStudents= await Student.insertMany(studentList);
        res.status(201).json(saveStudents)
    } catch (error) {
        res.status(500).json({error:'Internal server Error'})
    }
})
app.post('/create-exam', async (req, res) => {
    try {
      const examData = req.body;
      const savedExam = await Exam.create(examData);
      res.status(201).json(savedExam);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/add-mcq-questions/:examTitle', async (req, res) => {
    try {
      const examTitle = req.params.examTitle; 
      const mcqQuestions = req.body; 
  
     
      const updatedExam = await Exam.findOneAndUpdate(
        { title: examTitle },
        { $push: { mcqQuestions: mcqQuestions } },
        { new: true }
      );
  
      if (!updatedExam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
  
      res.status(200).json(updatedExam);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


app.post('/startexam/:examTitle', async (req, res) => {
    try {
      const examTitle = req.params.examTitle;
      const { name, rollNumber } = req.body;
      const exam = await Exam.findOne({ title: examTitle });
  
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      exam.isStarted = true;
      const examSubmission = {
        examTitle: examTitle,
        answers: [],
        isEvaluated: false,
        score: 0
      };
      student.examSubmissions.push(examSubmission);
      await Promise.all([exam.save(), student.save()]);
      const examDataForStudent = JSON.parse(JSON.stringify(exam));
      examDataForStudent.mcqQuestions.forEach(mcq => {
        delete mcq.correctOptionIndex;
      }); //i just make this for the front end part if one wants to send exam question data.
  
      res.status(200).json({message:'Exam Started Successfully',examDataForStudent});
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.post('/marked-answers/:examTitle', async (req, res) => {
    try {
      const examTitle = req.params.examTitle;
      const { name, rollNumber, markedChoices } = req.body;
  
      const exam = await Exam.findOne({ title: examTitle });
  
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
  
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
  
      const examSubmission = student.examSubmissions.find(
        submission => submission.examTitle === examTitle
      );
  
      if (!examSubmission) {
        return res.status(404).json({ error: 'Student submission not found' });
      }
  
      
      examSubmission.answers = markedChoices.map(choice => ({
        questionIndex: choice.questionIndex,
        selectedOptionIndex: choice.selectedOptionIndex,
      }));
  
      await student.save();
  
      res.status(200).json({ message: 'Marked answers submitted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  app.post('/review-exam/:examTitle', async (req, res) => {
    try {
      const examTitle = req.params.examTitle;
      const { name, rollNumber } = req.body;
  
      const exam = await Exam.findOne({ title: examTitle });
  
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
  
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
  
      const examSubmission = student.examSubmissions.find(
        submission => submission.examTitle === examTitle
      );
  
      if (!examSubmission) {
        return res.status(404).json({ error: 'Student submission not found' });
      }
  
      if (examSubmission.isEvaluated) {
        return res.status(400).json({ error: 'Exam already evaluated' });
      }
  
      const correctAnswers = exam.mcqQuestions.map(question => question.correctOptionIndex);
      const studentAnswers = examSubmission.answers.map(choice => choice.selectedOptionIndex);
  
      let score = 0;
      for (let i = 0; i < correctAnswers.length; i++) {
        if (correctAnswers[i] === studentAnswers[i]) {
          score++;
        }
      }
  
      examSubmission.isEvaluated = true;
      examSubmission.score = score;
      await student.save();
  
      res.status(200).json({ message: 'Exam evaluated successfully',score });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.post('/student-grades', async (req, res) => {
    try {
      const { name, rollNumber, subject } = req.body;
  
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const examSubmissionsForSubject = student.examSubmissions.filter(submission =>
        submission.examTitle.includes(subject)
      );
  
      const grades = examSubmissionsForSubject.map(submission => {
        return {
          examTitle: submission.examTitle,
          score: submission.score,
          grade: cGrade(submission.score)
        };
      });
  
      res.status(200).json(grades);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/mark-sheet', async (req, res) => {
    try {
      const { name, rollNumber } = req.body;
  
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
     //exam titles nikal
      const examTitles = Array.from(new Set(student.examSubmissions.map(submission => submission.examTitle)));
  
      const markSheet = examTitles.map(subject => {
        const examSubmissionsForSubject = student.examSubmissions.filter(submission =>
          submission.examTitle === subject
        );
  
        const totalMarks = examSubmissionsForSubject.reduce((total, submission) => total + submission.score, 0);
        const totalExams = examSubmissionsForSubject.length;
        const averageScore = totalExams > 0 ? totalMarks / totalExams : 0;
        const grade = cGrade(averageScore); 
  
        return {
          subject,
          totalMarks,
          totalExams,
          averageScore,
          grade
        };
      });
      student.markSheet = markSheet;
      await student.save();
  
      res.status(200).json(markSheet);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.post('/send-mark-sheet', async (req, res) => {
    try {
      const { name, rollNumber, parentEmail } = req.body;
  
     
      const student = await Student.findOne({ name, rollNumber });
  
      if (!student) {
        return res.status(404).json({ error: 'Student is not admitted' });
      }
  
      const markSheet = student.markSheet;
  
      
      await sendMarkSheetByEmail(parentEmail, markSheet);
  
      res.status(200).json({ message: 'Mark sheet sent successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})