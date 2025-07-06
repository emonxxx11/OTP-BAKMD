const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// ✅ Root route to verify server is live
app.get('/', (req, res) => {
  res.status(200).send('✅ OTP Server is Live!');
});

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "epic-e-sport",
    clientEmail: "firebase-adminsdk-fbsvc@epic-e-sport.iam.gserviceaccount.com",
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDqucqhoxAnEp/
coDOt43dgzh+Y3W5Dgt2cF7/VAAk3Z15P+twSWpRcDsu/N85slSvuNYB6X17+15Q
dJBiOP2CGgFLHuv1pCm0jaXy2WB3a8RJem8sGkKY0Icb73rRr/MsZQ1EHd9cgU7B
4OrHYgKA0Zbm5IVTpHBVn7ZY82BWJKZOjkg+jPLBrp22KbyS4jGXKUS/FIpHNFrx
ug8aBNywb5Do1Jkf5jP0PE3uswZI4kqLtLD42nnXMQkuOmFeYTHmyZWlvXgKP+U+
SU3GtfpCXC6ZF1HXe/Q/ewviNcR/jGt/6Kgv8b6uZpP8ivfNNZkKqW7E4bnXhdYm
VANQKGsfAgMBAAECggEAIbJwji/Ovp/L6qf3C+KroV7kX0vUrdJ/4d1XVuSKA89Q
u91ouBVEpJLN9nkhHmgaUorj/D9QV4ZCR1vTs7651eqRl3TTUSH89rXAQxLxnI9o
JflaZP9+wZ+D7SkwfyUsnVQn1TfJzD4OqLAJ7t1vreyqbsgjN/TlTbGsLyR2zk7C
0YEaPzua2Dpd1o+ovkAITzN5ViWc+Mdt5qxjd8Gaofeo8/jLz4oWUOwKswBes93H
tn2qp8tB2ztW3jgtGNjpb4/lp4UajWqkJHmNAVux5ZFeqeXC9lP14pOkGipd6CsP
h6aHFVA4UwnKgKLKvj8cUWyg21anZmuE/ppfFmRLbQKBgQD9SUDr7QJr6Uwt6CXM
bX7e+GliAd97pqdDEtPch1LPGyiYWmnQYOK+XhwHvASJFMFfWYQ28sPseiCYHSJx
78hS936S2VlW1UjGi5726tsqOdADOap4sX/WirPDo6F+M/4dsQ8NJwDFfzHaW5hd
UnCTw+usjdt9Aaj9vGEK8h7bWwKBgQDFw5sNT0PTRqMCw0lwpxx5aY3Nld3UuPh0
STnHAwmkWThXxa/6/YzNSTnhIEvaF54k4ajnOhx1Gvy6kPwY6rOJ1ST9tUuHjCaA
Tp9IQ9jVYWAavaXUGYAKda03cQZLkWIO6t9OCIPKZaDzgN5inO6VdvysC0guFyeP
y3Y/w6HujQKBgQCeFr+/wbHWOspCiPg2rU0XzEKyWmrr2aviUHkN1yTXgaMH3L7Y
wfAkU8b5COBn0x2S7uN4DHQ/QEbhyqV6KeiF6FYHQEPjz8HZssGoahQbOfRcXvzI
0jjxZqcnABXHGJqOW7oCQorXujkaijsCXHdJs2qAzBXn40ZgANktJMwfqwKBgAJj
0sPeaVtsRxwJcCHEYzu0YtpRLVUcxyPgnqohB0TNLzkgUngeCE2SzPhDg6cnEeow
L/JbaWyg3t0CU4mZjIHl6YSHZFpG/1Adox8kcsJhYt/v2sktZba6pVU+MG1JXH4B
qKEwySbxA3jt3cIjU17LCVKq8DxeW0QJmWw72QEhAoGBAKr7aKraDTsXxcyQUtPB
U8y7u/o9yzKJ1gZKEVAhb1YrZDncGdl3vC1sTbQX8sMrDrVFBiAe3lPhZ2VWoQfS
iOD77FgJllToI8YlA2BAHhNml7SppwaUdZymieM13P0ttcihM2i2+u6AvQXAn8F9
snZMQZNu27V+0TvCTRFCMViI
-----END PRIVATE KEY-----`
  }),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

// ✅ Setup nodemailer with your Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com',
    pass: 'emonxxxx1624' // Use app password if 2FA enabled
  }
});

// ✅ Send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const db = admin.database();
  const usersRef = db.ref('users');
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
});

// ✅ Verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const db = admin.database();
  const otpRef = db.ref(`otps/${email.replace('.', ',')}`);
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
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
