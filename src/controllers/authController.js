import { models } from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize'; 

const { Employee } = models; 

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/phone and password are required.' });
  }

  try {
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone: identifier },
          { id: identifier }
        ]
      }
    });

    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isPasswordMatch = await bcrypt.compare(password, employee.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // --- Fetch Permissions using Sequelize's association method ---
    let permissions = [];
    if (!employee.is_master) {
      const employeePermissions = await employee.getPermissions({
        attributes: ['code_name'], 
        raw: true 
      });
      permissions = employeePermissions.map(p => p.code_name);
    }
    
    const payload = {
      userId: employee.id,
      name: employee.name,
      is_master: !!employee.is_master,
      permissions: permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    // Update the last_login timestamp
    employee.last_login = new Date();
    await employee.save();

    res.status(200).json({
      message: 'Login successful!',
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        is_master: employee.is_master,
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};