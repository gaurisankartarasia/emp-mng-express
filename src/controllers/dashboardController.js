import { sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { PERMISSIONS } from '../../config/permissions.js';

const { Employee, Task } = sequelize.models;

export const getDashboardSummary = async (req, res) => {
    const { userId, is_master } = req.user;

    try {
        let summary = {};

        if (is_master) {
            const [totalEmployees, totalTasks, tasksInProgress, recentTasks, overallRating] = await Promise.all([
                Employee.count(),
                Task.count(),
                Task.count({ where: { status: 'in_progress' } }),
                Task.findAll({
                    limit: 5,
                    order: [['createdAt', 'DESC']],
                    include: { model: Employee, attributes: ['name'] }
                }),
                Task.findOne({
                    attributes: [[sequelize.fn('AVG', sequelize.col('completion_rating')), 'avgRating']],
                    where: { status: 'completed' },
                    raw: true
                })
            ]);
            summary = {
                kpi1: { title: "Total Employees", value: totalEmployees },
                kpi2: { title: "Total Tasks", value: totalTasks },
                kpi3: { title: "Tasks In Progress", value: tasksInProgress },
                kpi4: { title: "Overall Avg. Rating", value: parseFloat(overallRating.avgRating || 0).toFixed(2) },
                recentTasks
            };
        } else {
            const [myTasks, myTasksInProgress, myTasksCompleted, recentTasks, myRating] = await Promise.all([
                Task.count({ where: { EmployeeId: userId } }),
                Task.count({ where: { EmployeeId: userId, status: 'in_progress' } }),
                Task.count({ where: { EmployeeId: userId, status: 'completed' } }),
                Task.findAll({
                    where: { EmployeeId: userId },
                    limit: 5,
                    order: [['createdAt', 'DESC']]
                }),
                Task.findOne({
                    attributes: [[sequelize.fn('AVG', sequelize.col('completion_rating')), 'avgRating']],
                    where: { EmployeeId: userId, status: 'completed' },
                    raw: true
                })
            ]);
            summary = {
                kpi1: { title: "My Total Tasks", value: myTasks },
                kpi2: { title: "My Tasks In Progress", value: myTasksInProgress },
                kpi3: { title: "My Completed Tasks", value: myTasksCompleted },
                kpi4: { title: "My Avg. Rating", value: parseFloat(myRating.avgRating || 0).toFixed(2) },
                recentTasks
            };
        }

        res.status(200).json(summary);

    } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({ message: "Error fetching dashboard summary.", error: error.message });
    }
};


Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
   date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const calculatePerformanceForTimeframe = async (timeframe, whereClause) => {
    let dateBoundary;
    if (timeframe === 'weekly') {
        dateBoundary = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);
    } else { // monthly
        dateBoundary = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    }
    whereClause.createdAt = { [Op.gte]: dateBoundary };

    const dbData = await Task.findAll({
        where: whereClause,
        attributes: [
            [sequelize.fn('DATE', sequelize.col('Task.createdAt')), 'date_group'],
            [sequelize.fn('AVG', sequelize.col('completion_rating')), 'average_rating'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'task_count']
        ],
        group: ['date_group'],
        order: [[sequelize.col('date_group'), 'ASC']],
        raw: true
    });

    if (timeframe === 'weekly') {
        const dayMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(new Date().getDate() - i);
            const key = date.toISOString().split('T')[0];
            const label = `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}, ${date.toLocaleString('en-US', { weekday: 'short' })}`;
            dayMap.set(key, { name: label, rating: 0, count: 0 });
        }
        dbData.forEach(item => {
            if (dayMap.has(item.date_group)) {
                dayMap.get(item.date_group).rating = parseFloat(item.average_rating);
                dayMap.get(item.date_group).count = item.task_count;
            }
        });
        return Array.from(dayMap.values());
    } else { 
        const monthMap = new Map();
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const label = date.toLocaleString('en-US', { month: 'short' });
            monthMap.set(key, { name: label, rating: 0, count: 0 });
        }
        dbData.forEach(item => {
            const date = new Date(item.date_group);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (monthMap.has(key)) {
                monthMap.get(key).rating = parseFloat(item.average_rating);
                monthMap.get(key).count = item.task_count;
            }
        });
        return Array.from(monthMap.values());
    }
};


export const getCombinedPerformanceData = async (req, res) => {
    const { userId } = req.user;
    const { view = 'self' } = req.query;

    try {
        const isRequestingAllView = view === 'all';
        const baseWhereClause = { status: 'completed', completion_rating: { [Op.not]: null } };

        if (!isRequestingAllView) {
            baseWhereClause.EmployeeId = userId;
        }

        const [weeklyData, monthlyData] = await Promise.all([
            calculatePerformanceForTimeframe('weekly', { ...baseWhereClause }),
            calculatePerformanceForTimeframe('monthly', { ...baseWhereClause })
        ]);

        res.status(200).json({ weeklyData, monthlyData });

    } catch (error) {
        console.error("Combined chart data error:", error);
        res.status(500).json({ message: "Error fetching chart data.", error: error.message });
    }
};




