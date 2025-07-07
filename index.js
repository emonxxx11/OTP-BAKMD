const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();

require('dotenv').config(); // Load env vars

app.use(bodyParser.json());

// ✅ Build service account credentials from environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // fixes newline issues
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// ✅ Configure Nodemailer (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: epicesporthelp@gmail.com,     // Gmail
    pass: kdqoywirgxnbckge      // App Password
  }
});

// 🔢 Generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// ✅ POST /send-otp
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
    const safeEmailKey = email.replace(/[.#$[\]]/g, '_');
    await db.ref(`otps/${safeEmailKey}`).set(otpData);

    const mailOptions = {
      from: `"EPIC E-SPORT" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}\nThis code will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    res.json({ success: true, message: 'OTP sent to your email' });

  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
});

// ✅ POST /verify-otp
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

    if (elapsed > 300000) {
      await otpRef.remove();
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    await otpRef.remove(); // OTP verified, delete it
    res.json({ success: true, message: 'OTP verified successfully' });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP', error: error.message });
  }
});

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 OTP Server running on port ${PORT}`);
});
