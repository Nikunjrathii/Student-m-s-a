const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
  },
  examSubmissions: [
    {
      examTitle: { type: String, required: true },
      answers: [{ questionIndex: Number, selectedOptionIndex: Number }],
      isEvaluated: { type: Boolean, default: false },
      score: { type: Number, default: 0 }
    }
  ],
  markSheet: [
    {
      subject: String,
      totalMarks: Number,
      totalExams: Number,
      averageScore: Number,
      grade: String,
    },
  ],
 
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
