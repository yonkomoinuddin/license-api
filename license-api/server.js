require('dotenv').config();
const express = require('express');
const path = require('path');

const validateRoute = require('./routes/validate');
const adminRoute = require('./routes/admin');

const app = express();

// Required so req.ip reflects the real client IP when running behind a
// reverse proxy (nginx, Cloudflare, etc.) instead of the proxy's own IP.
// This matters a lot: IP binding/leak detection is only as accurate as
// req.ip is.
app.set('trust proxy', true);

app.use(express.json());

app.use('/api', validateRoute);
app.use('/api/admin', adminRoute);
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('license-api is running. Dashboard is at /dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`license-api listening on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});