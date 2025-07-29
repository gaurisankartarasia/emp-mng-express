import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sequelize } from './models/index.js'; 
import { fileURLToPath } from 'url';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import incrementRoutes from './routes/incrementRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import accountRoutes from './routes/accountRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import rulesRoutes from './routes/rulesRoutes.js'; 

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/increment-report', incrementRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/rules', rulesRoutes);

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