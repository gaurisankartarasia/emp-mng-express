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
      permissions: permissions,
      picture: employee.picture
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

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
        permissions: permissions,
        picture: employee.picture
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};



export const activateAccount = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: 'A valid token and a password of at least 6 characters are required.' });
    }

    try {
        const employee = await Employee.findOne({
            where: {
                activation_token: token,
                activation_token_expires_at: { [Op.gt]: new Date() } // Check if token is not expired
            }
        });

        if (!employee) {
            return res.status(400).json({ message: 'Invalid or expired activation link.' });
        }
        if (employee.is_active) {
            return res.status(400).json({ message: 'This account has already been activated.' });
        }

        employee.password = await bcrypt.hash(password, 10);
        employee.is_active = true;
        employee.activation_token = null;
        employee.activation_token_expires_at = null;
        await employee.save();
        
        res.status(200).json({ message: 'Account activated successfully! You can now log in.' });

    } catch (error) {
        res.status(500).json({ message: 'Server error during account activation.', error: error.message });
    }
};