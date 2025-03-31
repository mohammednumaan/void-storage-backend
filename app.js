// imports
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require("passport");
const cors = require("cors");
const compression = require("compression");
const { default: helmet } = require('helmet');

const expressSession = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const fileSystemRouter = require('./routes/fileSystem');

const { PrismaClient } = require('@prisma/client');

// configuring dotenv to access env variables
require('dotenv').config()

const app = express();
const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 50,
});

app.use(limiter);
app.use(helmet());
app.use(compression());
app.use(cors({origin: 'https://void-storage-frontend.vercel.app', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// basic session configuration
app.use(
  expressSession({
    cookie: {
      httpOnly: false,
      maxAge: 2 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: 'auto'
    },  
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  }),
)

// basic middleware setup
app.use(passport.session());
require('./passport/passport');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/file-system', fileSystemRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
