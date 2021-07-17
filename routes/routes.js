const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const user = require('../models/models.js');
const Camp = require('../models/camp.js');
const Cat = require('../models/cat.js');
const Message = require('../models/msg.js');
const multer = require('multer');
const fs = require('fs');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

router.use(express.static('public'));

router.use(bodyParser.urlencoded({ extended:true}));

router.use(cookieParser('secret'));
router.use(session({
	secret: 'secret',
	maxAge: 41536000,
	resave: true,
	saveUninitialized: true,
}));

router.use(passport.initialize());
router.use(passport.session());

router.use(flash());

//global variables
router.use(function(req, res, next){
	res.locals.success_message = req.flash('success_message');
	res.locals.error_message = req.flash('error_message');
	res.locals.error = req.flash('error');
	next();
});

const checkAuthenticated = function(req, res, next){
	if(req.isAuthenticated()){
		res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
		return next();
	}
	else{
		res.redirect('login');
	}
}

//creating database connection here
mongoose.connect("mongodb+srv://rhodzeey:12345@cluster0.tpb0e.mongodb.net/auth?retryWrites=true&w=majority", {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false
})
	mongoose.connection.on('connected', ()=>{
		console.log("Connected to database successfully");
	})
	mongoose.connection.off('error', (err)=>{
		console.log("Error connecing", err)
	})

router.get('/become-a-member', (req, res)=>{
	res.render('register', {title: 'Register'});
});

router.post('/register', (req, res)=>{
	var {email, username, password, confirm_password} = req.body;
	var err;
	if(!email || !username || !password || !confirm_password){
		err = "Please fill all fields.";
		res.render('register', {'err':err});
	}
	if(password != confirm_password){
		err = "Passwords Don't Match.";
		res.render('register', {'err':err, 'email':email, 'username':username});
	}
	if(typeof err == 'undefined'){
		user.findOne({email: email}, function(err, data){
			if(err) throw err;
			if(data){
				console.log("User Exists");
				err = "User already exists with the email";
				res.render('register', {'err':err, 'email':email, 'username':username});
			}else{
				bcrypt.genSalt(10, (err, salt)=>{
					if(err) throw err;
					bcrypt.hash(password, salt, (err, hash)=>{
						if(err) throw err;
						password = hash;
						user({
							email,
							username,
							password,
						}).save((err, data)=>{
							if(err) throw err;
							req.flash('success_message', "Registered Successfully");
							res.redirect('/login');
						});
					});
				});
			}
		});
	}
});

//authentication strategy
var localStrategy = require('passport-local').Strategy;
passport.use(new localStrategy({ usernameField : 'email' }, (email, password, done)=>{
	user.findOne({email : email}, (err, data)=>{
		if(err) throw err;
		if(!data){
			return done(null, false, {message : "User does not exist"});
		}
		bcrypt.compare(password, data.password, (err, match)=>{
			if(err){
				return done(null, false);
			}
			if(!match){
				return done(null, false, {message : "Wrong credentials"});
			}
			if(match){
				return done(null, data);
			}
		});
	});
}));

passport.serializeUser(function(user, cb){
	cb(null, user.id);
});

passport.deserializeUser(function(id, cb){
	user.findById(id, function(err, user){
		cb(err, user);
	});
});
//end of authentication strategy


router.get('/login', (req, res)=>{
	res.render('login', {title: 'Login'});
});

router.post('/login', (req, res, next)=>{
	passport.authenticate('local', {
		failureRedirect : '/login',
		successRedirect : '/home-page',
		failureFlash : true,
	})(req, res, next);
});


router.get('/', (req, res)=>{
	res.render('login');
});

router.get('/home-page', checkAuthenticated, (req, res)=>{
	Camp.find({ "category": "Education" }).limit(3).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('index',{
				title: 'Home',
				camps: camps,
			});
		}
	});
});

//route responsible for starting a campaign
router.get('/create-campaign', checkAuthenticated, (req, res)=>{
	res.render('create-campaign', {title: 'Create'});
});

router.get('/logout', (req, res)=>{
	req.logout();
	res.render('login');
});

router.get('/category-box', checkAuthenticated, (req, res)=>{
	Cat.find().exec((err, cats)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('category-box',{
				title: 'Category Box',
				cats: cats,
			});
		}
	});
});

router.get('/why-donate-with-us', checkAuthenticated, (req, res)=>{
	res.render('news', {title: 'Blog'});
});

router.get('/how-it-works', checkAuthenticated, (req, res)=>{
	res.render('how-it-works', {title: 'How Yamba Works'});
});


//image upload
var storage = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './uploads');
	},
	filename: function(req, file, cb){
		cb(null, file.fieldname+"_"+Date.now()+"_"+file.originalname);
	},
});

var upload = multer({
	storage: storage,
}).single("image");

//route to create a campaign
router.post('/create-campaign', upload, (req, res)=>{
	const camp = new Camp({
		name: req.body.name,
		phone: req.body.phone,
		location: req.body.location,
		category: req.body.category,
		title: req.body.title,
		amount: req.body.amount,
		image: req.file.filename,
		story: req.body.story,
	});
	camp.save((err)=>{
		if(err){
			res.json({message: err.message, type: 'danger'});
		}else{
			console.log("campaign sent");
			res.redirect('/home-page');
		}
	});
});


//route to create a category
router.post('/create-category', upload, (req, res)=>{
	const category = new Cat({
		category: req.body.category,
		image: req.file.filename,
	});
	category.save((err)=>{
		if(err){
			res.json({message: err.message, type:'danger'});
		}else{
			console.log("Category Created");
			res.redirect('/category-box');
		}
	})
});

//route to get the create-category page
router.get('/create-category', (req, res)=>{
	res.render('create-category', {title:'Create Category'});
});

//route to send message
router.post('/send-message', (req, res)=>{
	const Msg = new Message({
		name: req.body.name,
		email: req.body.email,
		phone: req.body.phone,
		message: req.body.message,
	});
	Msg.save((err)=>{
		if(err){
			res.json({message: err.message, type:'danger'});
		}else{
			console.log("message sent");
			res.redirect('/home-page');
		}
	});
});

router.get('/contact-us', checkAuthenticated, (req, res)=>{
	res.render('contact-us', {title:'Contact Us'});
});

//routes to fetch specified categories
router.get('/category-box/medical', (req, res)=>{
	Camp.find({ "category": "Medical" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Medical',
				camps: camps,
			});
		}
	});
});

router.get('/category-box/education', (req, res)=>{
	Camp.find({ "category": "Education" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Education',
				camps: camps,
			});
		}
	});;
});

router.get('/category-box/finance', (req, res)=>{
	Camp.find({ "category": "Financial Emergency" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Finance',
				camps: camps,
			});
		}
	});
});

router.get('/category-box/emergency', (req, res)=>{
	Camp.find({ "category": "Emergency" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Emergency',
				camps: camps,
			});
		}
	});
});

router.get('/category-box/church', (req, res)=>{
	Camp.find({ "category": "Church" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Church',
				camps: camps,
			});
		}
	});
});

router.get('/category-box/shelter', (req, res)=>{
	Camp.find({ "category": "Shelter" }).exec((err, camps)=>{
		if(err){
			res.json({message: err.message});
		}else{
			res.render('view-category',{
				title: 'Housing',
				camps: camps,
			});
		}
	});
});

module.exports = router;