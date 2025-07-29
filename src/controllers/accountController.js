import { sequelize } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import path from 'path'
import fs from 'fs'


const Employee = sequelize.models.Employee;

// --- GET CURRENT USER'S PROFILE ---
export const getMyProfile = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.user.userId, {
            attributes: { exclude: ['password', 'is_master'] }
        });
        if (!employee) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.status(200).json(employee);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile.', error: error.message });
    }
};




export const updateMyProfile = async (req, res) => {
    const { name, email, phone, address, removePicture } = req.body;
    try {
        const employee = await Employee.findByPk(req.user.userId);
        if (!employee) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        if (email && email !== employee.email) {
            const existing = await Employee.findOne({ 
                where: { email, id: { [Op.ne]: req.user.userId } } 
            });
            if (existing) {
                return res.status(409).json({ message: 'Email is already in use by another account.' });
            }
        }
        
        const oldPicturePath = employee.picture;

        employee.name = name || employee.name;
        employee.email = email || employee.email;
        employee.phone = phone || employee.phone;
        employee.address = address || employee.address;

        if (req.file) {
            employee.picture = req.file.path;
        } else if (removePicture === 'true') {
            employee.picture = null;
        }

        await employee.save();

        if (oldPicturePath && oldPicturePath !== employee.picture) {
            const fullPath = path.join('public', oldPicturePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error("Error updating profile:", error); 
        res.status(500).json({ message: 'Error updating profile.', error: error.message });
    }
};

// --- CHANGE CURRENT USER'S PASSWORD ---
export const changeMyPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Both old and new passwords are required. New password must be at least 6 characters.' });
    }
    
    try {
        const employee = await Employee.findByPk(req.user.userId);
        if (!employee) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const isPasswordMatch = await bcrypt.compare(oldPassword, employee.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Incorrect old password.' });
        }

        employee.password = await bcrypt.hash(newPassword, 10);
        await employee.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password.', error: error.message });
    }
};