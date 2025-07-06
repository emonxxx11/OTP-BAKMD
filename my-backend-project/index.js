const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Firebase credentials directly
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: "epic-e-sport",
    private_key_id: "453563399c0127bdb39c018320741194f623e5ea",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDqucqhoxAnEp/\ncoDOt43dgzh+Y3W5Dgt2cF7/VAAk3Z15P+twSWpRcDsu/N85slSvuNYB6X17+15Q\ndJBiOP2CGgFLHuv1pCm0jaXy2WB3a8RJem8sGkKY0Icb73rRr/MsZQ1EHd9cgU7B\n4OrHYgKA0Zbm5IVTpHBVn7ZY82BWJKZOjkg+jPLBrp22KbyS4jGXKUS/FIpHNFrx\nug8aBNywb5Do1Jkf5jP0PE3uswZI4kqLtLD42nnXMQkuOmFeYTHmyZWlvXgKP+U+\nSU3GtfpCXC6ZF1HXe/Q/ewviNcR/jGt/6Kgv8b6uZpP8ivfNNZkKqW7E4bnXhdYm\nVANQKGsfAgMBAAECggEAIbJwji/Ovp/L6qf3C+KroV7kX0vUrdJ/4d1XVuSKA89Q\nu91ouBVEpJLN9nkhHmgaUorj/D9QV4ZCR1vTs7651eqRl3TTUSH89rXAQxLxnI9o\nJflaZP9+wZ+D7SkwfyUsnVQn1TfJzD4OqLAJ7t1vreyqbsgjN/TlTbGsLyR2zk7C\n0YEaPzua2Dpd1o+ovkAITzN5ViWc+Mdt5qxjd8Gaofeo8/jLz4oWUOwKswBes93H\ntn2qp8tB2ztW3jgtGNjpb4/lp4UajWqkJHmNAVux5ZFeqeXC9lP14pOkGipd6CsP\nh6aHFVA4UwnKgKLKvj8cUWyg21anZmuE/ppfFmRLbQKBgQD9SUDr7QJr6Uwt6CXM\nbX7e+GliAd97pqdDEtPch1LPGyiYWmnQYOK+XhwHvASJFMFfWYQ28sPseiCYHSJx\n78hS936S2VlW1UjGi5726tsqOdADOap4sX/WirPDo6F+M/4dsQ8NJwDFfzHaW5hd\nUnCTw+usjdt9Aaj9vGEK8h7bWwKBgQDFw5sNT0PTRqMCw0lwpxx5aY3Nld3UuPh0\nSTnHAwmkWThXxa/6/YzNSTnhIEvaF54k4ajnOhx1Gvy6kPwY6rOJ1ST9tUuHjCaA\nTp9IQ9jVYWAavaXUGYAKda03cQZLkWIO6t9OCIPKZaDzgN5inO6VdvysC0guFyeP\ny3Y/w6HujQKBgQCeFr+/wbHWOspCiPg2rU0XzEKyWmrr2aviUHkN1yTXgaMH3L7Y\nwfAkU8b5COBn0x2S7uN4DHQ/QEbhyqV6KeiF6FYHQEPjz8HZssGoahQbOfRcXvzI\n0jjxZqcnABXHGJqOW7oCQorXujkaijsCXHdJs2qAzBXn40ZgANktJMwfqwKBgAJj\n0sPeaVtsRxwJcCHEYzu0YtpRLVUcxyPgnqohB0TNLzkgUngeCE2SzPhDg6cnEeow\nL/JbaWyg3t0CU4mZjIHl6YSHZFpG/1Adox8kcsJhYt/v2sktZba6pVU+MG1JXH4B\nqKEwySbxA3jt3cIjU17LCVKq8DxeW0QJmWw72QEhAoGBAKr7aKraDTsXxcyQUtPB\nU8y7u/o9yzKJ1gZKEVAhb1YrZDncGdl3vC1sTbQX8sMrDrVFBiAe3lPhZ2VWoQfS\niOD77FgJllToI8YlA2BAHhNml7SppwaUdZymieM13P0ttcihM2i2+u6AvQXAn8F9\nsnZMQZNu27V+0TvCTRFCMViI\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@epic-e-sport.iam.gserviceaccount.com",
    client_id: "105289591999658971800",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc@epic-e-sport.iam.gserviceaccount.com"
  }),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Gmail config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'epicesporthelp@gmail.com',
    pass: 'emonxxxx1624'
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const usersRef = db.ref('users');

  usersRef.once('value', (snapshot) => {
    const users = snapshot.val();
    const userFound = Object.values(users).find(user => user.email === email);

    if (!userFound) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const otp = generateOTP();
    const otpRef = db.ref('otps').child(email.replace(/\./g, '_'));

    otpRef.set({ otp });
    setTimeout(() => otpRef.remove(), 5 * 60 * 1000); // 5 minutes

    const mailOptions = {
      from: 'epicesporthelp@gmail.com',
      to: email,
      subject: 'Your OTP for Epic E-Sport',
      text: `Your one-time password (OTP) is: ${otp}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.status(500).json({ message: 'Email error', error: err });
      res.status(200).json({ message: 'OTP sent successfully' });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
