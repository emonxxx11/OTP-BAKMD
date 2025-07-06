const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Load Firebase service account key from JSON file
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com', // your gmail
    pass: 'emonxxxx1624'              // your app password (use app password if 2FA enabled)
  }
});

// Root route - check if server is live
app.get('/', (req, res) => {
  res.status(200).send('✅ OTP Server is Live!');
});

// Send OTP endpoint
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
      from: 'epicesporthelp@gmail.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to send OTP email' });
      }
      res.json({ message: 'OTP sent successfully' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP endpoint
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
