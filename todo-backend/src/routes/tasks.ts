import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Task from '../models/Task';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

interface AuthRequest extends Request {
  user?: { userId: string };
}

// ==========================================
// INLINE JWT AUTHENTICATION MIDDLEWARE
// ==========================================
// Intercepts requests to verify the Bearer token and extract the logged-in userId
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No valid token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET) as { userId: string };
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

router.use(authenticate as any);

// ==========================================
// GET /api/tasks - FETCH & SORT TASKS
// ==========================================
// Implements the custom mix algorithm: Completion Status -> Priority Weight -> Deadline Urgency
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // 1. Fetch only tasks belonging to the authenticated user
    const tasks = await Task.find({ userId: req.user?.userId });

    // 2. Assign numerical weights to priorities for mathematical comparison
    const priorityWeights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

    // 3. Custom Multi-Tier Sorting Algorithm
    const sortedTasks = tasks.sort((a, b) => {
      // Tier 1: Active tasks always float above completed tasks
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      // Tier 2: Sort by Priority Weight (High [3] -> Medium [2] -> Low [1])
      const weightDiff = (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      if (weightDiff !== 0) return weightDiff;

      // Tier 3: If priorities are identical, sort by Deadline Urgency (Earlier deadlines first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }

      // Tier 4: Fallback to chronological order (Most recently created first)
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });

    res.json(sortedTasks);
  } catch (err: any) {
    console.error("GET /tasks Database Error:", err.message);
    res.status(500).json({ error: 'Failed to fetch tasks from database.' });
  }
});

// ==========================================
// POST /api/tasks - CREATE NEW TASK
// ==========================================
router.post('/', async (req: AuthRequest, res: Response) => {
  console.log("DEBUG POST /tasks - Incoming Body:", req.body);
  
  try {
    const { title, description, deadline, dateTime, priority } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description || 'No description provided.',
      deadline: deadline || 'No deadline',
      dateTime: dateTime || new Date().toLocaleDateString(),
      priority: priority || 'Medium', // Applies selected priority or defaults to Medium
      completed: false,
      userId: req.user?.userId,
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err: any) {
    console.error("POST /tasks Save Error:", err.message);
    res.status(500).json({ error: err.message || 'Failed to create task in database.' });
  }
});

// ==========================================
// PUT /api/tasks/:id - UPDATE TASK
// ==========================================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { completed, title, description, deadline, dateTime, priority } = req.body;
    
    // Updates only provided fields while ensuring user ownership
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { 
        $set: { 
          ...(completed !== undefined && { completed }), 
          ...(title && { title }),
          ...(description && { description }),
          ...(deadline && { deadline }),
          ...(dateTime && { dateTime }),
          ...(priority && { priority })
        } 
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    res.json(updatedTask);
  } catch (err: any) {
    console.error("PUT /tasks/:id Error:", err.message);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// ==========================================
// DELETE /api/tasks/:id - REMOVE TASK
// ==========================================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?.userId,
    });

    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (err: any) {
    console.error("DELETE /tasks/:id Error:", err.message);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

export default router;