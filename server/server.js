require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[DRAG BOOST] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});