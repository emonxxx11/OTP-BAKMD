const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory store for OTPs (not for production)
const otpStore = new Map();

app.get('/', (req, res) => {
  res.send('✅ OTP Server is Live!');
});

app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP in store with expiry (5 minutes)
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  console.log(`Sending OTP ${otp} to ${email}`);

  // TODO: Send OTP email here (use nodemailer or any email service)

  return res.json({ success: true, message: 'OTP sent' });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP found for this email' });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  otpStore.delete(email);
  return res.json({ success: true, message: 'OTP verified' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
