import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendInvitationEmail = async (email, token) => {
    // const activationLink = `http://localhost:5173/activate-account?token=${token}`;
        // const activationLink = `http://10.20.124.221:5173/activate-account?token=${token}`;
    const activationLink = `https://emp-mng-react.vercel.app/activate-account?token=${token}`;

    
    // http://10.20.124.221:5173/

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Activate Your Account',
        html: `
            <h1>Welcome!</h1>
            <p>An account has been created for you. Please click the link below to set your password and activate your account.</p>
            <a href="${activationLink}">Activate Account</a>
            <p>This link will expire in 24 hours.</p>
        `
    };

    await transporter.sendMail(mailOptions);
};