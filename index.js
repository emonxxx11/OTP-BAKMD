// server.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-key.json'); // Your Firebase admin SDK JSON file path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Configure Nodemailer transporter using your Gmail + app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com',
    pass: 'pyjfxxsimldgdrjw' // **your app password without spaces**
  }
});

// Helper: Generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// POST /send-otp
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const otp = generateOtp();
  const otpData = {
    otp,
    createdAt: Date.now()
  };

  try {
    // Save OTP to Firebase under /otps/{email} node (replacing '.' in email to avoid key issues)
    const safeEmailKey = email.replace(/[.#$[\]]/g, '_');
    await db.ref(`otps/${safeEmailKey}`).set(otpData);

    // Send OTP email
    const mailOptions = {
      from: '"EPIC E-SPORT" <epicesporthelp@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}\nThis code will expire in 5 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email', error: error.message });
  }
});

// POST /verify-otp
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const safeEmailKey = email.replace(/[.#$[\]]/g, '_');
  const otpRef = db.ref(`otps/${safeEmailKey}`);

  try {
    const snapshot = await otpRef.once('value');
    const otpData = snapshot.val();

    if (!otpData) {
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    }

    const now = Date.now();
    const elapsed = now - otpData.createdAt;

    // Check OTP validity (5 minutes = 300000 ms)
    if (elapsed > 300000) {
      await otpRef.remove();
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified - remove from DB
    await otpRef.remove();

    res.json({ success: true, message: 'OTP verified successfully' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP', error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
