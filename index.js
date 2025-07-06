const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

// Initialize Firebase Admin SDK with your service account key JSON file
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-key.json')),
  databaseURL: 'https://epic-e-sport-default-rtdb.firebaseio.com/'
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Configure nodemailer transporter with Gmail SMTP and app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com',          // Replace with your Gmail
    pass: 'pyjfxxsimldgdrjw'     // Replace with your Gmail App Password
  }
});

// Utility function to encode email (replace . with , to use as Firebase key)
function encodeEmail(email) {
  return email.replace(/\./g, ',');
}

app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

app.post('/send-otp', async (req, res) => {
  try {
    console.log('Received /send-otp request:', req.body);

    const { email } = req.body;
    if (!email) {
      console.log('Email missing in request');
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

    const encodedEmail = encodeEmail(email);

    // Save OTP + expiration in Firebase Realtime Database
    await admin.database().ref(`otps/${encodedEmail}`).set({ code: otp, expiresAt });
    console.log(`Saved OTP for ${email}: ${otp}`);

    // Send OTP email
    await transporter.sendMail({
      from: '"EPIC E-SPORT" <epicesporthelp@gmail.com>',  // Your sender email
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    });

    console.log(`OTP email sent to ${email}`);

    res.json({ success: true, message: 'OTP sent and saved in Firebase' });
  } catch (error) {
    console.error('Error in /send-otp:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email', error: error.message });
  }
});

// For testing: a verify endpoint (optional)
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const encodedEmail = encodeEmail(email);
    const snapshot = await admin.database().ref(`otps/${encodedEmail}`).once('value');
    const data = snapshot.val();

    if (!data) {
      return res.status(400).json({ success: false, message: 'No OTP found for this email' });
    }

    if (data.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // OTP verified, delete it from DB
    await admin.database().ref(`otps/${encodedEmail}`).remove();

    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Error in /verify-otp:', error);
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`OTP Server listening on port ${port}`);
});
