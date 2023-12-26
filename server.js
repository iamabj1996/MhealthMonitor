const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

//Connect Database
connectDB();

//adding cors rule
app.use(
	cors({
		origin: '*',
	})
);

//Initialize middleware
app.use(express.json({ extended: false, limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

app.get('/', (req, res) => {
	res.send('API running ');
});

//Define routes
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/owner', require('./routes/api/owner'));
app.use('/api/auth', require('./routes/api/auth'));

//Define Port
const PORT = process.env.PORT || 5000;

//Listen to the application
app.listen(PORT, () => {
	console.log(`Server started on ${PORT}`);
});
