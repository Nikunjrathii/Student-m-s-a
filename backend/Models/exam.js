const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  totalMarks:{
type:Number,
required:true,
  },
  mcqQuestions: [
    {
      question: {
        type: String,
        required: true,
      },
      options: {
        type: [String],
        required: true,
      },
      correctOptionIndex: {
        type: Number,
        required: true,
      },
    },
  ],
  
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
