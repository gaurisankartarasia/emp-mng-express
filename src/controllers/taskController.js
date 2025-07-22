import { models } from '../models/index.js';
const { Task, Employee } = models;
import { Op } from 'sequelize';

// export const getTasks = async (req, res) => {
//   const { is_master, userId } = req.user;
//   const whereClause = is_master ? {} : { EmployeeId: userId };

//   try {
//     const tasks = await Task.findAll({
//       where: whereClause,
//       include: {
//         model: Employee,
//         attributes: ['name']
//       },
//       order: [['createdAt', 'DESC']]
//     });
//     res.status(200).json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching tasks', error: error.message });
//   }
// };


export const getTasks = async (req, res) => {
  const { is_master, userId } = req.user;
  const { search } = req.query; 

  try {
    const whereClause = {};
    const includeOptions = {
      model: Employee,
      attributes: ['name']
    };

    if (is_master) {
      if (search) {
        whereClause[Op.or] = [
           { id: { [Op.like]: `%${search}%` } },
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { '$Employee.name$': { [Op.like]: `%${search}%` }, '$Employee.id$': { [Op.like]: `%${search}%` } } 
        ]; 
      }
    } else {
      whereClause.EmployeeId = userId;
      if (search) {
        whereClause[Op.or] = [
           { id: { [Op.like]: `%${search}%` } },
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

export const createTask = async (req, res) => {
  const { title, description } = req.body;
  const { userId } = req.user;

  try {
    const task = await Task.create({
      title,
      description,
      EmployeeId: userId
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const { userId, is_master } = req.user;

  try {
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    if (task.EmployeeId !== userId && !is_master) {
      return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;
  const { userId, is_master } = req.user;
  
  try {
      const task = await Task.findByPk(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }
      if (task.EmployeeId !== userId && !is_master) {
        return res.status(403).json({ message: 'Forbidden: You do not own this task.' });
      }

      await task.destroy();
      res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
      res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status, duration_minutes } = req.body;
    const { userId, is_master } = req.user;

    try {
        const task = await Task.findByPk(id);
        if (!task) return res.status(404).json({ message: 'Task not found.' });
        if (task.EmployeeId !== userId && !is_master) return res.status(403).json({ message: 'Forbidden.' });

        const now = new Date();

        switch (status) {
            case 'set_duration':
                task.assigned_duration_minutes = duration_minutes;
                break;
            case 'start':
                if (task.status !== 'pending' || !task.assigned_duration_minutes) return res.status(400).json({ message: 'Task cannot be started.' });
                task.status = 'in_progress';
                task.actual_start_time = task.actual_start_time || now;
                task.last_resume_time = now;
                break;
            case 'pause':
                if (task.status !== 'in_progress') return res.status(400).json({ message: 'Task is not in progress.' });
                task.status = 'paused';
                task.accumulated_duration_seconds += Math.round((now - new Date(task.last_resume_time)) / 1000);
                task.last_resume_time = null;
                break;
            case 'resume':
                if (task.status !== 'paused') return res.status(400).json({ message: 'Task is not paused.' });
                task.status = 'in_progress';
                task.last_resume_time = now;
                break;
            case 'complete':
                if (task.status !== 'in_progress') return res.status(400).json({ message: 'Task is not in progress.' });
                
                const final_session_seconds = task.last_resume_time ? Math.round((now - new Date(task.last_resume_time)) / 1000) : 0;
                const total_seconds = task.accumulated_duration_seconds + final_session_seconds;
                
                task.status = 'completed';
                task.actual_end_time = now;
                task.accumulated_duration_seconds = total_seconds;
                task.last_resume_time = null;
                
                // Simplified rating logic for now
                if(task.assigned_duration_minutes){
                    const efficiency = (total_seconds / 60) / task.assigned_duration_minutes;
                    if (efficiency <= 1) task.completion_rating = 5;
                    else if (efficiency <= 1.2) task.completion_rating = 3;
                    else task.completion_rating = 1;
                }
                break;
            default:
                return res.status(400).json({ message: 'Invalid status update.' });
        }
        
        await task.save();
        res.status(200).json(task);

    } catch (error) {
        res.status(500).json({ message: 'Error updating task status', error: error.message });
    }
};