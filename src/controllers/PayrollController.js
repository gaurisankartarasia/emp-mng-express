import { models } from '../models/index.js';
import { Op } from 'sequelize';

const { Employee, Attendance, LeaveRequest, LeaveType, PayrollReport, SalarySlip } = models;

const runPayrollGeneration = async (reportId, month, year) => {
    console.log(`Starting payroll generation for report ID: ${reportId} (${month}/${year})`);
    
    try {
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));
        const totalDaysInMonth = endDate.getUTCDate();

        const [activeEmployees, allAttendanceForMonth, allApprovedLeavesForMonth] = await Promise.all([
            Employee.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'current_salary']
            }),
            Attendance.findAll({
                where: {
                    date: { [Op.between]: [startDate, endDate] },
                    check_in_time: { [Op.ne]: null } 
                }
            }),
            LeaveRequest.findAll({
                where: {
                    status: 'approved',
                    start_date: { [Op.lte]: endDate },
                    end_date: { [Op.gte]: startDate }
                },
                include: { model: LeaveType, as: 'LeaveType' }
            })
        ]);
        
        const salarySlipsToCreate = [];

        for (const employee of activeEmployees) {
            const monthlySalary = parseFloat(employee.current_salary);
            if (isNaN(monthlySalary) || monthlySalary <= 0) {
                console.log(`Skipping employee ID ${employee.id} (${employee.name}) due to invalid salary.`);
                continue; 
            }

            const employeeAttendance = allAttendanceForMonth.filter(a => a.employee_id === employee.id);
            const employeeLeaves = allApprovedLeavesForMonth.filter(l => l.employee_id === employee.id);
            
            
            const processedDates = new Set();
            let presentDaysCount = 0;
            let paidLeaveDaysCount = 0;

            employeeAttendance.forEach(att => {
                const dateStr = att.date;
                if (!processedDates.has(dateStr)) {
                    processedDates.add(dateStr);
                    presentDaysCount++;
                }
            });

            employeeLeaves.forEach(leave => {
                let currentDate = new Date(leave.start_date);
                const leaveEndDate = new Date(leave.end_date);
                
                while (currentDate <= leaveEndDate) {
                    if (currentDate >= startDate && currentDate <= endDate) {
                        const dateStr = currentDate.toISOString().split('T')[0];
                        if (!processedDates.has(dateStr)) {
                            processedDates.add(dateStr);
                            if (!leave.LeaveType.is_unpaid) {
                                paidLeaveDaysCount++;
                            }
                        }
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });

            const totalPayableDays = presentDaysCount + paidLeaveDaysCount;

            const perDaySalary = monthlySalary / totalDaysInMonth;
            const finalSalary = totalPayableDays * perDaySalary;
            const totalDeductions = monthlySalary - finalSalary;
            const unpaidDays = totalDaysInMonth - totalPayableDays;

            salarySlipsToCreate.push({
                report_id: reportId,
                employee_id: employee.id,
                employee_name: employee.name,
                gross_salary: monthlySalary,
                per_day_salary: perDaySalary,
                total_payable_days: totalPayableDays,
                deductions: totalDeductions,
                net_salary: finalSalary,
                breakdown_data: {
                    presentDays: presentDaysCount,
                    paidLeaveDays: paidLeaveDaysCount,
                    unpaidDays: unpaidDays
                }
            });
        }
        
        if (salarySlipsToCreate.length > 0) {
            await SalarySlip.bulkCreate(salarySlipsToCreate);
        }

        await PayrollReport.update(
            { status: 'completed', generated_at: new Date() },
            { where: { id: reportId } }
        );
        
        console.log(`Successfully completed payroll generation for report ID: ${reportId}`);

    } catch (error) {
        console.error(`Payroll generation failed for report ID: ${reportId}. Error: ${error.message}`);
        
        await PayrollReport.update(
            { status: 'failed', error_log: error.message },
            { where: { id: reportId } }
        );
    }
};



export const initiatePayrollGeneration = async (req, res) => {
    const { month, year } = req.body;
    const { userId } = req.user;

    try {
        const existingReport = await PayrollReport.findOne({ where: { month, year, status: ['completed', 'processing'] } });
        if (existingReport) {
            return res.status(409).json({ message: `A report for ${month}/${year} is already completed or currently processing.`, reportId: existingReport.id });
        }

        const newReport = await PayrollReport.create({ month, year, generated_by_id: userId, status: 'processing' });
        
        res.status(202).json({ message: 'Payroll generation initiated.', reportId: newReport.id });

        runPayrollGeneration(newReport.id, month, year);

    } catch (error) {
        res.status(500).json({ message: 'Failed to initiate payroll generation.', error: error.message });
    }
};

export const getReportStatus = async (req, res) => {
    const { reportId } = req.params;
    try {
        const report = await PayrollReport.findByPk(reportId, { attributes: ['id', 'status', 'error_log'] });
        if (!report) return res.status(404).json({ message: 'Report not found.' });
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report status.' });
    }
};

export const getPayrollReport = async (req, res) => {
    const { reportId } = req.params;
    try {
        const report = await PayrollReport.findByPk(reportId, {
            include: [
                { model: SalarySlip, as: 'SalarySlips' },
                { model: Employee, attributes: ['name'] }
            ]
        });
        if (!report) return res.status(404).json({ message: 'Report not found.' });
        if (report.status !== 'completed') return res.status(400).json({ message: 'Report is still processing or has failed.' });
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payroll report.' });
    }
};

export const getRecentReports = async (req, res) => {
    try {
        const reports = await PayrollReport.findAll({
            order: [['year', 'DESC'], ['month', 'DESC']],
            limit: 12 
        });
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent reports.' });
    }
};