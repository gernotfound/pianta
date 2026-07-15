const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const host = '0.0.0.0';

const isProd = process.env.NODE_ENV === 'production';
const staticPath = isProd ? path.join(__dirname, 'dist') : __dirname;

app.use(express.static(staticPath));

app.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}/ serving ${staticPath}`);
});
