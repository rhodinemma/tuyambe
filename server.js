const express = require('express');
const app = express();
const morgan = require('morgan');
const path = require('path');

app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(morgan('tiny'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', require('./routes/routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server started at port ${PORT}`));