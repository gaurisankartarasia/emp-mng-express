import { models } from '../models/index.js';
const { Task, Employee } = models;
import { Op } from 'sequelize';





export const getTasks = async (req, res) => {
  const { is_master, userId } = req.user;
  const { search, page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  try {
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const whereClause = {};
    const includeOptions = { model: Employee, attributes: ['name'] };
    
    if (is_master) {
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
           { id: { [Op.like]: `%${search}%` } },
          { '$Employee.name$': { [Op.like]: `%${search}%` } },
          { '$EmployeeId$': { [Op.like]: `%${search}%` } }
        ];
      }
    } else {
      whereClause.EmployeeId = userId;
      if (search) {
        whereClause.title = { [Op.like]: `%${search}%` };
      }
    }

    const { count, rows } = await Task.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: limit,
      offset: offset,
      order: [[sortBy, sortOrder]]
    });

    res.status(200).json({
      data: rows,
      totalPages: Math.ceil(count / limit),
      totalItems: count
    });
  } catch (error) {
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
                
                if(task.assigned_duration_minutes){
                    const actual_minutes = total_seconds / 60;
                    const time_ratio = actual_minutes / task.assigned_duration_minutes;
                    
                    if (time_ratio < 0.8) {
                        task.completion_rating = 5;
                    } else if (time_ratio >= 0.8 && time_ratio < 0.9) {
                        task.completion_rating = 4;
                    } else if (time_ratio >= 0.9 && time_ratio <= 1.0) {
                        task.completion_rating = 3;
                    } else if (time_ratio > 1.0 && time_ratio <= 1.1) {
                        task.completion_rating = 2;
                    } else {
                        task.completion_rating = 1;
                    }
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