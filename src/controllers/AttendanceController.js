import { models } from '../models/index.js';
const { Attendance } = models;


const getCurrentDate = () => new Date().toISOString().split('T')[0];




export const getTodaysAttendance = async (req, res) => {
    const { userId } = req.user;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const attendance = await Attendance.findOne({
            where: { employee_id: userId, date: today }
        });

        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching today\'s attendance.', error: error.message });
    }
};


export const checkIn = async (req, res) => {
    const { userId } = req.user;
    const today = getCurrentDate();

    try {
        const [attendance, created] = await Attendance.findOrCreate({
            where: { employee_id: userId, date: today },
            defaults: {
                employee_id: userId,
                date: today,
                check_in_time: new Date() 
            }
        });

        if (!created) {
            if (!attendance.check_in_time) {
                attendance.check_in_time = getCurrentTime();
                await attendance.save();
                return res.status(200).json({ message: 'Checked in successfully.', attendance });
            }
            return res.status(409).json({ message: 'You have already checked in today.' });
        }

        res.status(201).json({ message: 'Checked in successfully.', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error during check-in.', error: error.message });
    }
};

export const checkOut = async (req, res) => {
    const { userId } = req.user;
    const today = getCurrentDate();

    try {
        const attendance = await Attendance.findOne({
            where: { employee_id: userId, date: today }
        });

        if (!attendance || !attendance.check_in_time) {
            return res.status(404).json({ message: 'You have not checked in yet today.' });
        }
        if (attendance.check_out_time) {
            return res.status(409).json({ message: 'You have already checked out today.' });
        }
         attendance.check_out_time = new Date();
        await attendance.save();
        
        res.status(200).json({ message: 'Checked out successfully.', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error during check-out.', error: error.message });
    }
};