import express from 'express';
import { protect } from '../middleware/AuthMiddleware.js';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} from '../controllers/TaskController.js';

const router = express.Router();

router.use(protect);

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateTaskStatus); 

export default router;