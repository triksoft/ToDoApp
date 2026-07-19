import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// TYPESCRIPT INTERFACE
// ==========================================
// Defines the exact shape of a Task document in MongoDB
export interface ITask extends Document {
  title: string;
  description?: string;
  deadline?: string;
  dateTime?: string;
  priority: 'High' | 'Medium' | 'Low'; // Added priority level for custom sorting
  completed: boolean;
  userId: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==========================================
// MONGOOSE SCHEMA
// ==========================================
const TaskSchema: Schema = new Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Task title is required'], 
      trim: true 
    },
    // Optional fields with safe defaults to prevent database validation crashes
    description: { 
      type: String, 
      default: '' 
    },
    deadline: { 
      type: String, 
      default: '' 
    },
    dateTime: { 
      type: String, 
      default: '' 
    },
    // Priority enum restricts values strictly to High, Medium, or Low
    priority: { 
      type: String, 
      enum: ['High', 'Medium', 'Low'], 
      default: 'Medium' 
    },
    completed: { 
      type: Boolean, 
      default: false 
    },
    // Links every task directly to the user who created it
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
  },
  { timestamps: true } // Automatically manages createdAt and updatedAt fields
);

export default mongoose.model<ITask>('Task', TaskSchema);