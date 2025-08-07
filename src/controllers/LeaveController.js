

import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

const { LeaveRequest, LeaveType, Employee, CompanyRule } = models;



const calculateCalendarDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) return 0;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

const addCalendarDays = (date, days) => {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const toYYYYMMDD = (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
};

const getMonthBounds = (date) => {
    const d = new Date(date);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    endOfMonth.setUTCHours(23, 59, 59, 999);
    return { startOfMonth, endOfMonth };
};


export const validateLeaveRequest = async (req, res) => {
    const { leave_type_id, start_date, end_date } = req.body;
    const { userId } = req.user;

    if (!leave_type_id || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required fields for validation.' });
    }
    if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); 
    if (new Date(start_date) < today) {
        return res.status(400).json({ message: 'Start date cannot be before today.' });
    }

    try {


 const existingPendingRequest = await LeaveRequest.findOne({
            where: {
                employee_id: userId,
                status: 'pending'
            }
        });

        if (existingPendingRequest) {
            return res.status(400).json({ 
                message: 'You already have a leave request pending approval. Please wait for it to be processed before submitting a new one.' 
            });
        }

        const rules = await LeaveType.findByPk(leave_type_id);
        if (!rules) {
            return res.status(404).json({ message: "Invalid leave type specified." });
        }

        const requestedDays = calculateCalendarDays(start_date, end_date);
        
        if (rules.max_days_per_request && requestedDays > rules.max_days_per_request) {
            return res.status(400).json({
                message: `Request for ${requestedDays} days failed. You cannot request more than ${rules.max_days_per_request} days for this leave type at once.`
            });
        }
        
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);

        let remainingMonthlyBalance = Infinity;
        if (rules.monthly_allowance_days) {
            const requestStartDate = new Date(start_date);
            const { startOfMonth, endOfMonth } = getMonthBounds(requestStartDate);
            
            const leavesAffectingThisMonth = await LeaveRequest.findAll({
                where: {
                    employee_id: userId,
                    leave_type_id: leave_type_id,
                    status: { [Op.in]: ['approved', 'pending'] },
                    start_date: { [Op.lte]: endOfMonth },
                    end_date: { [Op.gte]: startOfMonth }
                }
            });
            
            let alreadyTakenThisMonth = 0;
            leavesAffectingThisMonth.forEach(leave => {
                const leaveStart = new Date(leave.start_date);
                const leaveEnd = new Date(leave.end_date);
                leaveStart.setUTCHours(0, 0, 0, 0);
                leaveEnd.setUTCHours(0, 0, 0, 0);
                
                const overlapStart = leaveStart > startOfMonth ? leaveStart : startOfMonth;
                const overlapEnd = leaveEnd < endOfMonth ? leaveEnd : endOfMonth;
                
                if (overlapStart <= overlapEnd) {
                    alreadyTakenThisMonth += calculateCalendarDays(overlapStart, overlapEnd);
                }
            });
            
            const newRequestStart = new Date(start_date);
            const newRequestEnd = new Date(end_date);
            newRequestStart.setUTCHours(0, 0, 0, 0);
            newRequestEnd.setUTCHours(0, 0, 0, 0);
            
            const requestOverlapStart = newRequestStart > startOfMonth ? newRequestStart : startOfMonth;
            const requestOverlapEnd = newRequestEnd < endOfMonth ? newRequestEnd : endOfMonth;
            
            let daysInThisMonth = 0;
            if (requestOverlapStart <= requestOverlapEnd) {
                daysInThisMonth = calculateCalendarDays(requestOverlapStart, requestOverlapEnd);
            }
            
            remainingMonthlyBalance = rules.monthly_allowance_days - alreadyTakenThisMonth;
            
    
            if (daysInThisMonth > remainingMonthlyBalance) {
                remainingMonthlyBalance = remainingMonthlyBalance; 
            } else if (daysInThisMonth < requestedDays) {
              
                remainingMonthlyBalance = remainingMonthlyBalance;
            }
        }

        let remainingAnnualCapBalance = Infinity;
        if (!rules.is_unpaid) {
            const totalCapRule = await CompanyRule.findOne({ where: { rule_key: 'total_annual_leave_cap' } });
            if (totalCapRule) {
                const totalAnnualCap = Number(totalCapRule.rule_value);
                const allPaidLeaves = await LeaveRequest.findAll({
                    where: { 
                        employee_id: userId, 
                        status: { [Op.in]: ['approved', 'pending'] }
                    },
                    include: [{ model: LeaveType, where: { is_unpaid: false } }]
                });

                let totalPaidDaysTakenThisYear = 0;
                allPaidLeaves.forEach(leave => {
                    const leaveStart = new Date(leave.start_date);
                    const leaveEnd = new Date(leave.end_date);
                    leaveStart.setUTCHours(0, 0, 0, 0);
                    leaveEnd.setUTCHours(0, 0, 0, 0);
                    
                    const effectiveStart = leaveStart > startOfYear ? leaveStart : startOfYear;
                    const effectiveEnd = leaveEnd < endOfYear ? leaveEnd : endOfYear;
                    if(effectiveStart <= effectiveEnd) {
                        totalPaidDaysTakenThisYear += calculateCalendarDays(effectiveStart, effectiveEnd);
                    }
                });
                remainingAnnualCapBalance = totalAnnualCap - totalPaidDaysTakenThisYear;
            }
        }
        
        const trulyAvailableDays = Math.min(remainingMonthlyBalance, remainingAnnualCapBalance);
        const limitingFactor = remainingMonthlyBalance < remainingAnnualCapBalance ? 'monthly_allowance' : 'annual_cap';

        if (requestedDays > trulyAvailableDays) {
            const primaryPortionDays = Math.max(0, trulyAvailableDays);
            const secondaryPortionDays = requestedDays - primaryPortionDays;

            const primaryEndDate = addCalendarDays(start_date, primaryPortionDays - 1);
            const secondaryStartDate = addCalendarDays(primaryEndDate, 1);
            
            const message = `Your request for ${requestedDays} days exceeds your available balance of ${trulyAvailableDays} days (based on your ${limitingFactor}) for ${rules.name}.`;

            return res.status(200).json({
                status: "split_proposal",
                message: message,
                limitingFactor: limitingFactor,
                proposal: {
                    primary: primaryPortionDays > 0 ? {
                        leave_type_id: rules.id,
                        leave_type_name: rules.name,
                        days: primaryPortionDays,
                        start_date: toYYYYMMDD(new Date(start_date)),
                        end_date: toYYYYMMDD(primaryEndDate)
                    } : null,
                    secondary: {
                        days: secondaryPortionDays,
                        start_date: toYYYYMMDD(secondaryStartDate),
                        end_date: toYYYYMMDD(new Date(end_date))
                    }
                }
            });
        }
        
        return res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error("Error in validateLeaveRequest:", error);
        res.status(500).json({ message: 'Server error during leave validation.' });
    }
};


export const getCalendarData = async (req, res) => {
    const { userId } = req.user;
    
    try {
        const existingLeaves = await LeaveRequest.findAll({
            where: {
                employee_id: userId,
                status: { [Op.in]: ['pending', 'approved'] }
            },
            include: [{
                model: LeaveType,
                as: 'LeaveType', 
                attributes: ['id', 'name'] 
            }],
            attributes: ['id', 'start_date', 'end_date', 'status', 'reason'] 
        });

        res.status(200).json({ existingLeaves });

    } catch (error){
        console.error("Error fetching calendar data:", error);
        res.status(500).json({ message: 'Server error fetching calendar data.' });
    }
};


export const createSingleLeaveRequest = async (req, res) => {
const { leave_type_id, start_date, end_date, reason } = req.body;
const { userId } = req.user;
if (!leave_type_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'Missing required fields for leave creation.' });
}

try {
     const days = calculateCalendarDays(start_date, end_date);

    const newRequest = await LeaveRequest.create({
        employee_id: userId,
        leave_type_id,
        start_date,
        end_date,
         days: days,
        reason,

        status: 'pending' 
    });

    res.status(201).json(newRequest);

} catch (error) {
    console.error("Error in createSingleLeaveRequest:", error);
    res.status(500).json({ message: 'Server error while creating leave request.' });
}
};

export const createSplitLeaveRequest = async (req, res) => {
    const { primary, secondary } = req.body; 
    const { userId } = req.user;
    const reason = req.body.reason;

    if (!primary || !secondary || !secondary.leave_type_id) {
        return res.status(400).json({ message: 'Invalid split request data.' });
    }

    const t = await sequelize.transaction();
    const batchId = crypto.randomUUID();

    try {
        const requestsToCreate = [];
        
        if (primary.days > 0) {
            requestsToCreate.push({
                employee_id: userId,
                leave_type_id: primary.leave_type_id,
                start_date: primary.start_date,
                end_date: primary.end_date,
                 days: calculateCalendarDays(primary.start_date, primary.end_date),
                reason: reason || "", status: 'pending', batch_id: batchId
            });
        }

        requestsToCreate.push({
            employee_id: userId,
            leave_type_id: secondary.leave_type_id,
            start_date: secondary.start_date,
            end_date: secondary.end_date,
             days: calculateCalendarDays(secondary.start_date, secondary.end_date),
            reason: reason || "", status: 'pending', batch_id: batchId
        });

        await LeaveRequest.bulkCreate(requestsToCreate, { transaction: t });
        await t.commit();
        
        return res.status(201).json({ message: 'Split leave request created successfully.', batch_id: batchId });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Error in createSplitLeaveRequest:", error);
        return res.status(500).json({ message: 'Server error while creating split request.' });
    }
};

export const getMyLeaveRequests = async (req, res) => {
    const { userId } = req.user;
    const { page = 1, pageSize = 10, search = '', status = '', is_unpaid = '', sortBy = 'start_date', sortOrder = 'DESC' } = req.query;

    if (!userId) {
        return res.status(403).json({ message: "Forbidden: User ID not found in token." });
    }

    try {
        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(page, 10) - 1) * limit;

        const whereClause = { employee_id: userId };
        const includeOptions = {
            model: LeaveType,
            as: 'LeaveType',
            attributes: ['name', 'is_unpaid']
        };

        if (search) {
            whereClause[Op.or] = [
                !isNaN(parseInt(search)) ? { id: parseInt(search) } : null,
                { reason: { [Op.like]: `%${search}%` } }
            ].filter(Boolean);
        }

        if (status) {
            whereClause.status = status;
        }
        if (is_unpaid !== '') { 
            includeOptions.where = { is_unpaid: is_unpaid === 'true' };
        }

           const order = [];
        if (sortBy) {
            order.push([sortBy, sortOrder === 'DESC' ? 'DESC' : 'ASC']);
        } else {
            order.push(['start_date', 'DESC']);
        }
        
        const { count, rows } = await LeaveRequest.findAndCountAll({
            where: whereClause,
            include: [includeOptions],
            limit,
            offset,
            order: [[sortBy, sortOrder]]
        });

        res.status(200).json({
            data: rows,
            pageCount: Math.ceil(count / limit),
            totalItems: count
        });

    } catch (error) {
        console.error("Error fetching leave requests:", error);
        res.status(500).json({ message: 'Server error while fetching your leave requests.' });
    }
};

export const getManagedLeaveRequests = async (req, res) => {
  try {
  
    const requests = await LeaveRequest.findAll({
      include: [
        { model: Employee, attributes: ['id', 'name', 'email'] },
        { model: LeaveType, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching managed leave requests.', error: error.message });
  }
};



export const updateLeaveRequest = async (req, res) => {
    const { status, manager_comments, new_start_date, new_end_date } = req.body;
    const { id } = req.params;
    const { userId, is_master } = req.user;

    try {
        const request = await LeaveRequest.findByPk(id, {
            include: { model: LeaveType, as: 'LeaveType' }
        });

        if (!request) return res.status(404).json({ message: 'Leave request not found.' });
        if (request.status !== 'pending') return res.status(400).json({ message: "This request has already been finalized." });
        if (request.employee_id === userId && !is_master) return res.status(403).json({ message: "Forbidden: You cannot update your own leave request." });

        if (status === 'rejected') {
            request.status = 'rejected';
            request.manager_comments = manager_comments || request.manager_comments;
            await request.save();
            return res.status(200).json(request);
        }

        if (status === 'approved') {
            const originalStartDate = new Date(request.start_date);
            const originalEndDate = new Date(request.end_date);
            const approvedStartDate = new_start_date ? new Date(new_start_date) : originalStartDate;
            const approvedEndDate = new_end_date ? new Date(new_end_date) : originalEndDate;
            
            originalStartDate.setUTCHours(0, 0, 0, 0);
            originalEndDate.setUTCHours(0, 0, 0, 0);
            approvedStartDate.setUTCHours(0, 0, 0, 0);
            approvedEndDate.setUTCHours(0, 0, 0, 0);

            if (approvedStartDate < originalStartDate || approvedEndDate > originalEndDate || approvedStartDate > approvedEndDate) {
                return res.status(400).json({ message: "Invalid date range. Approved dates must be within the original request period." });
            }

             if (!request.LeaveType.is_unpaid) {
                const totalCapRule = await CompanyRule.findOne({ where: { rule_key: 'total_annual_leave_cap' } });
                if (totalCapRule) {
                    const totalAnnualCap = Number(totalCapRule.rule_value);
                    const allPaidLeaves = await LeaveRequest.findAll({
                        where: { employee_id: request.employee_id, status: { [Op.in]: ['approved', 'pending'] }, id: { [Op.ne]: request.id } },
                        include: [{ model: LeaveType, where: { is_unpaid: false } }]
                    });
                    const totalPaidDaysTaken = allPaidLeaves.reduce((total, leave) => total + calculateCalendarDays(leave.start_date, leave.end_date), 0);

                    if ((totalPaidDaysTaken + daysToApprove) > totalAnnualCap) {
                        const remaining = totalAnnualCap - totalPaidDaysTaken;
                        return res.status(400).json({ message: `Approval failed. This would exceed the employee's total annual paid leave limit. They only have ${Math.max(0, remaining)} days remaining.` });
                    }
                }
            }

            const t = await sequelize.transaction();
            try {
                if (approvedStartDate.getTime() > originalStartDate.getTime()) {
                    const rejectedEndDate = addCalendarDays(approvedStartDate, -1);
                    const rejectedDays = calculateCalendarDays(originalStartDate, rejectedEndDate);
                    if (rejectedDays > 0) {
                        await LeaveRequest.create({
                            employee_id: request.employee_id, leave_type_id: request.leave_type_id,
                            start_date: toYYYYMMDD(originalStartDate),
                            end_date: toYYYYMMDD(rejectedEndDate),
                            days: rejectedDays,
                            reason: `Rejected initial portion of request #${request.id}`,
                            status: 'rejected',
                            manager_comments: manager_comments || "This portion was not approved."
                        }, { transaction: t });
                    }
                }

                if (approvedEndDate.getTime() < originalEndDate.getTime()) {
                    const rejectedStartDate = addCalendarDays(approvedEndDate, 1);
                    const rejectedDays = calculateCalendarDays(rejectedStartDate, originalEndDate);
                    if (rejectedDays > 0) {
                        await LeaveRequest.create({
                            employee_id: request.employee_id, leave_type_id: request.leave_type_id,
                            start_date: toYYYYMMDD(rejectedStartDate),
                            end_date: toYYYYMMDD(originalEndDate),
                            days: rejectedDays,
                            reason: `Rejected final portion of request #${request.id}`,
                            status: 'rejected',
                            manager_comments: manager_comments || "This portion was not approved."
                        }, { transaction: t });
                    }
                }

                request.start_date = toYYYYMMDD(approvedStartDate);
                request.end_date = toYYYYMMDD(approvedEndDate);
                request.days = calculateCalendarDays(approvedStartDate, approvedEndDate);
                request.status = 'approved';
                request.manager_comments = manager_comments || request.manager_comments;
                await request.save({ transaction: t });

                await t.commit();
                return res.status(200).json({ message: "Leave request updated successfully." });

            } catch (error) {
                await t.rollback();
                throw error;
            }
        }

        return res.status(400).json({ message: "Invalid status provided." });

    } catch (error) {
        console.error("Error updating leave request:", error);
        res.status(500).json({ message: 'Error updating leave request', error: error.message });
    }
};


export const getLeaveConfig = async (req, res) => {
    try {
        const { userId } = req.user;
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [allLeaveTypes, companyRules, allApprovedLeaves] = await Promise.all([
            LeaveType.findAll({ order: [['name', 'ASC']] }),
            CompanyRule.findAll(),
            LeaveRequest.findAll({
                where: {
                    employee_id: userId,
                    status: 'approved',
                    start_date: { [Op.lte]: endOfYear },
                    end_date: { [Op.gte]: startOfYear }
                }
            })
        ]);
        
        const rulesMap = new Map(companyRules.map(rule => [rule.rule_key, rule.rule_value]));
        const totalAnnualCap = Number(rulesMap.get('total_annual_leave_cap')) || 0;

        let totalPaidDaysTakenThisYear = 0;
        let totalUnpaidDaysTakenThisYear = 0;
        let totalUnpaidDaysTakenThisMonth = 0;

        const balanceDetails = allLeaveTypes.map(lt => {
            const monthlyAllowance = lt.monthly_allowance_days;
            
            const leavesOfThisType = allApprovedLeaves.filter(al => al.leave_type_id === lt.id);
            
            let daysTakenThisYear = 0;
            leavesOfThisType.forEach(leave => {
                const effectiveStart = new Date(leave.start_date) > startOfYear ? new Date(leave.start_date) : startOfYear;
                const effectiveEnd = new Date(leave.end_date) < endOfYear ? new Date(leave.end_date) : endOfYear;
                if (effectiveStart <= effectiveEnd) {
                    daysTakenThisYear += calculateCalendarDays(effectiveStart, effectiveEnd);
                }
            });

            if (lt.is_unpaid) {
                totalUnpaidDaysTakenThisYear += daysTakenThisYear;
            } else {
                totalPaidDaysTakenThisYear += daysTakenThisYear;
            }

            return {
                id: lt.id,
                name: lt.name,
                is_unpaid: lt.is_unpaid,
                monthly_allowance: monthlyAllowance, 
                taken: daysTakenThisYear,
            };
        });
        
        const unpaidLeaveTypeIds = allLeaveTypes.filter(lt => lt.is_unpaid).map(lt => lt.id);
        if (unpaidLeaveTypeIds.length > 0) {
            const unpaidLeavesThisMonth = allApprovedLeaves.filter(al => unpaidLeaveTypeIds.includes(al.leave_type_id));
            unpaidLeavesThisMonth.forEach(leave => {
                const effectiveStart = new Date(leave.start_date) > startOfMonth ? new Date(leave.start_date) : startOfMonth;
                const effectiveEnd = new Date(leave.end_date) < endOfMonth ? new Date(leave.end_date) : endOfMonth;
                if (effectiveStart <= effectiveEnd) {
                    totalUnpaidDaysTakenThisMonth += calculateCalendarDays(effectiveStart, effectiveEnd);
                }
            });
        }
        
        const annualBalance = {
            allowance: totalAnnualCap,
            taken: totalPaidDaysTakenThisYear,
            remaining: totalAnnualCap - totalPaidDaysTakenThisYear,
        };
        
        const unpaidLeaveBalance = {
            takenThisYear: totalUnpaidDaysTakenThisYear,
            takenThisMonth: totalUnpaidDaysTakenThisMonth
        };
        
        res.status(200).json({
            leaveTypes: allLeaveTypes,
            balanceDetails,
            annualBalance,
            unpaidLeaveBalance
        });

    } catch (error) {
        console.error("Error fetching leave config:", error);
        res.status(500).json({ message: 'Error fetching leave configuration.' });
    }
};