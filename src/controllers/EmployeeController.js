import { sequelize } from "../models/index.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import path from "path";
import fs from "fs";
import { randomBytes } from 'crypto'; 
import { sendInvitationEmail } from '../utils/emailService.js'; 



const Employee = sequelize.models.Employee;



export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, address, joined_at, current_salary } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingEmployee) {
      if (!existingEmployee.is_active) {
        const newActivationToken = randomBytes(32).toString('hex');
        existingEmployee.activation_token = newActivationToken;
        existingEmployee.activation_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await existingEmployee.save();
        
        await sendInvitationEmail(existingEmployee.email, newActivationToken);
        return res.status(200).json({ message: `This user already exists but is not active. A new invitation has been sent to ${email}.` });
      }
      return res.status(409).json({ message: "An employee with this email already exists and is active." });
    }

  
    const activationToken = randomBytes(32).toString('hex');
    const employeeData = {
      name,
      email,
      phone,
      address,
      joined_at,
      current_salary,
      password: null,
      is_active: false,
      picture: req.file?.path || null,
      activation_token: activationToken,
      activation_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    const newEmployee = await Employee.create(employeeData);

    console.log('Created Employee Object in DB:', newEmployee.toJSON());

    if (!newEmployee || !newEmployee.activation_token) {
        console.error('CRITICAL: Employee was created but activation_token was not saved.');
        throw new Error("Failed to save activation token to the database.");
    }
    
    await sendInvitationEmail(newEmployee.email, newEmployee.activation_token);

    res.status(201).json({ message: `Invitation sent to ${email}.` });

  } catch (error) {
    console.error("Error in createEmployee flow:", error);
    res.status(500).json({ message: "Server error while creating invitation." });
  }
};


// export const getEmployees = async (req, res) => {
//   try {
//     const { search } = req.query;
//     const whereClause = {};

//     if (search) {
//       whereClause[Op.or] = [
//         { id: { [Op.like]: `%${search}%` } },
//         { name: { [Op.like]: `%${search}%` } },
//         { email: { [Op.like]: `%${search}%` } },
//         { phone: { [Op.like]: `%${search}%` } },
//       ];
//     }

//     const employees = await Employee.findAll({
//       where: whereClause,
//       attributes: [
//         "id",
//         "name",
//         "email",
//         "phone",
//         "picture",
//         "joined_at",
//         "is_master",
//         "address",
//         "current_salary",
//         "last_login",
//         "createdAt",
//         "updatedAt",
//       ],
//       order: [["name", "ASC"]],
//     });
//     res.status(200).json(employees);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch employees." });
//   }
// };


export const getEmployees = async (req, res) => {
  try {
    const { search, page = 1, pageSize = 10, sortBy = 'joined_at', sortOrder = 'DESC' } = req.query;

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
         { phone: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
           { current_salary: { [Op.like]: `%${search}%` } },
      ];
    }
    
    const { count, rows } = await Employee.findAndCountAll({
      where: whereClause,
            attributes: [
        "id",
        "name",
        "email",
        "phone",
        "picture",
        "joined_at",
        "is_master",
        "address",
        "current_salary",
        "last_login",
        "createdAt",
        "updatedAt",
      ],
      limit: limit,
      offset: offset,
      order: [[sortBy, sortOrder]] 
    });

    res.status(200).json({
      data: rows,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees.' });
  }
};




export const getManageableEmployees = async (req, res) => {
  const requestingUserId = req.user.userId;
  const { search } = req.query;

  try {
    const whereClause = {
      is_master: false,
      id: { [Op.ne]: requestingUserId },
    };

    if (search) {
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const employees = await Employee.findAll({
      attributes: ["id", "name", "email", "phone", "picture", "is_master"],
      where: whereClause,
      order: [["name", "ASC"]],
    });
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error in getManageableEmployees:", error);
    res.status(500).json({ message: "Failed to fetch manageable employees." });
  }
};

export const getEmployeeById = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findByPk(id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "picture",
        "joined_at",
        "is_master",
        "address",
        "current_salary",
        "last_login",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }
    res.status(200).json(employee);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error while fetching employee data." });
  }
};


// export const createEmployee = async (req, res) => {
//   const { name, email, phone, password, confirmPassword, address, joined_at, current_salary } = req.body;

//   if (!name || !email || !password || !joined_at) {
//     return res.status(400).json({ message: "Name, email, password, and joining date are required." });
//   }
//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: 'Passwords do not match.' });
//   }
//   if (phone && !/^\d{10}$/.test(phone)) {
//     return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
//   }

//   try {
//     const existingEmployee = await Employee.findOne({ where: { email } });
//     if (existingEmployee) {
//       return res.status(409).json({ message: "Employee with this email already exists." });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newEmployee = await Employee.create({
//       name,
//       email,
//       phone,
//       address,
//       joined_at,
//       current_salary,
//       password: hashedPassword,
//       picture: req.file?.path || null,
//     });
//     const employeeData = newEmployee.toJSON();
//     delete employeeData.password;
//     delete employeeData.is_master;
//     res.status(201).json(employeeData);
//   } catch (error) {
//     console.error("Error creating employee:", error);
//     res.status(500).json({ message: "Server error while creating employee." });
//   }
// };

export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password, removePicture, address } = req.body;
  try {
    const employee = await Employee.findByPk(id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found." });

    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        where: {
          email,
          id: { [Op.ne]: id },
        },
      });
      if (existingEmployee)
        return res
          .status(409)
          .json({
            message: "This email is already in use by another employee.",
          });
    }

    const oldPicturePath = employee.picture;

    if (req.file) {
      employee.picture = req.file.path;
    } else if (removePicture === "true") {
      employee.picture = null;
    }

    employee.name = name || employee.name;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.address = address || employee.address;
    if (password) {
      employee.password = await bcrypt.hash(password, 10);
    }

    await employee.save();

    if (oldPicturePath && oldPicturePath !== employee.picture) {
      const fullPath = path.join("public", oldPicturePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    const employeeData = employee.toJSON();
    delete employeeData.password;
    res.status(200).json(employeeData);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error while updating employee." });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  const requestingUserId = req.user.userId;
  if (parseInt(id, 10) === requestingUserId) {
    return res
      .status(403)
      .json({ message: "You cannot delete your own account." });
  }
  if (parseInt(id, 10) === 1) {
    return res
      .status(403)
      .json({ message: "The primary master account cannot be deleted." });
  }
  try {
    const result = await Employee.destroy({ where: { id: id } });
    if (result === 0) {
      return res.status(404).json({ message: "Employee not found." });
    }
    res.status(200).json({ message: "Employee deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting employee." });
  }
};
