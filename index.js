const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ✅ Health check route
app.get('/', (req, res) => {
  res.status(200).send('✅ OTP Server is Live!');
});

// ✅ Load Firebase credentials from ENV
const serviceAccountPath = process.env.FIREBASE_CREDENTIALS_PATH;

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error("❌ Firebase credentials file not found or not set.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// ✅ Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

// ✅ Setup nodemailer (with Gmail or other provider)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.OTP_EMAIL_USER,     // Set in environment
    pass: process.env.OTP_EMAIL_PASS      // App Password (NOT real Gmail password)
  }
});

// ✅ Send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const db = admin.database();
  const usersRef = db.ref('users');

  try {
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpRef = db.ref(`otps/${email.replace('.', ',')}`);
    await otpRef.set({
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    const mailOptions = {
      from: process.env.OTP_EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Mail error:", error);
        return res.status(500).json({ error: 'Failed to send OTP email' });
      }
      res.json({ message: 'OTP sent successfully' });
    });

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const db = admin.database();
  const otpRef = db.ref(`otps/${email.replace('.', ',')}`);

  try {
    const snapshot = await otpRef.once('value');

    if (!snapshot.exists()) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    const data = snapshot.val();

    if (Date.now() > data.expiresAt) {
      await otpRef.remove();
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (otp !== data.code) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await otpRef.remove();
    res.json({ message: 'OTP verified successfully' });

  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
