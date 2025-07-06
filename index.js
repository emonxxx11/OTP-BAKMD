const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

// Dummy in-memory OTP storage
const otpStore = {};

// Replace with your verified Gmail account and app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com', // ✅ your Gmail address
    pass: 'emonxxxx1624'    // ✅ app-specific password, NOT your normal password
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

// Send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  try {
    await transporter.sendMail({
      from: 'epicesporthelp@gmail.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`
    });

    console.log(`✅ OTP ${otp} sent to ${email}`);
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email' });
  }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const validOtp = otpStore[email];

  if (validOtp && validOtp === otp) {
    delete otpStore[email]; // remove OTP after verification
    return res.json({ success: true, message: 'OTP verified' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
