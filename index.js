const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
app.use(express.json());

// ✅ Load Firebase credentials from file
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

// ✅ Setup nodemailer (use Gmail App Password!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com',
    pass: 'pyjfxxsimldgdrjw' // Replace with Gmail App Password
  }
});

// ✅ API: Root status check
app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

// ✅ API: Send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins from now

  const encodedEmail = email.replace('.', ',');

  // ✅ Save OTP to Firebase
  const otpRef = admin.database().ref(`otps/${encodedEmail}`);
  await otpRef.set({ code: otp, expiresAt });

  // ✅ Send email
  const mailOptions = {
    from: 'epicesporthelp@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }
    res.json({ success: true, message: 'OTP sent and saved in Firebase' });
  });
});

// ✅ API: Verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  const encodedEmail = email.replace('.', ',');
  const otpRef = admin.database().ref(`otps/${encodedEmail}`);
  const snapshot = await otpRef.once('value');

  if (!snapshot.exists()) {
    return res.status(404).json({ success: false, message: 'OTP not found or expired' });
  }

  const data = snapshot.val();

  if (Date.now() > data.expiresAt) {
    await otpRef.remove();
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (otp !== data.code) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  await otpRef.remove(); // ✅ Remove OTP after successful verification
  res.json({ success: true, message: 'OTP verified successfully' });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
