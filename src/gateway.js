import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sequelize } from './models/index.js'; 
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/AuthRoutes.js';
import employeeRoutes from './routes/EmployeeRoutes.js';
import taskRoutes from './routes/TaskRoutes.js';
import incrementRoutes from './routes/IncrementRoutes.js';
import permissionRoutes from './routes/PermissionRoutes.js';
import accountRoutes from './routes/AccountRoutes.js'
import dashboardRoutes from './routes/DashboardRoutes.js';
import policyRoutes from './routes/PolicyRoutes.js';
import leaveRoutes from './routes/LeaveRoutes.js';
import rulesRoutes from './routes/RulesRoutes.js'; 

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
    // origin: 'http://localhost:5173', 
        origin: process.env.CORS_ORIGIN, 

    credentials: true   
}));
app.use(cookieParser());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/increment-report', incrementRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/policy', policyRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/rules', rulesRoutes);

app.get('/', (req, res) => {
  res.send('Running...');
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('db success');
    

    // await sequelize.sync({ alter: true });
    console.log('sync success');

    app.listen(PORT, () => {
      console.log(`bluetooth connected on ${PORT}`);
    });
  } catch (error) {
    console.error( error);
  }
};

startServer();