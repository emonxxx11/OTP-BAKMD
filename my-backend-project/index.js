require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-firebase-database-url.firebaseio.com"  // Replace with your Realtime DB URL
});

const db = admin.database();

// Configure Nodemailer transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your gmail address
    pass: process.env.EMAIL_PASS    // your gmail app password
  }
});

// Utility: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Endpoint to request OTP
app.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Check if email exists in your Firebase DB users node
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Generate OTP and expiration time (5 min)
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes in ms

    // Save OTP temporarily in Firebase under "otps/email"
    const otpRef = db.ref('otps').child(email.replace(/\./g, '_'));
    await otpRef.set({ otp, expiresAt });

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Epic E-Sport OTP Code',
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    });

    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Error in /request-otp:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Endpoint to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    const otpRef = db.ref('otps').child(email.replace(/\./g, '_'));
    const snapshot = await otpRef.once('value');

    if (!snapshot.exists()) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    const data = snapshot.val();
    if (data.otp === otp && Date.now() < data.expiresAt) {
      // OTP valid, delete it after verification
      await otpRef.remove();
      return res.json({ message: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

  } catch (error) {
    console.error('Error in /verify-otp:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
