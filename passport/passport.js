// imports
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { PrismaClient } = require('@prisma/client');

// initialize a prisma client object
const prisma = new PrismaClient();

// define a verify callback that will be later used by the passport
// framework for authentication
const verifyCallback = async (username, password, done) => {
    try{
        const user = await prisma.user.findUnique({where: {username}});
        if (!user){
            return done(null, false, {message: "Invalid Username Or Password."});
        }

        const isValidPassword = bcrypt.compare(password, user.password_hash);
        return !isValidPassword ? done(null, false, {message: "Invalid Username Or Password."}) : done(null, user);

    } catch (err){
        done(err);
    }
}

// configuring passport to use LocalStrategy for authentication 
const strategy = new LocalStrategy(verifyCallback);
passport.use(strategy);

// this method serializes the user to the session
// whenever a user is logged in (sets req.session.passport.user)  
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// this method does the opposite, it deserializes the user
// from the session (i.e from req.session.passport.user)
passport.deserializeUser(async (userId, done) => {
  try {
    const user = await prisma.user.findUnique({where : {id: userId}});
    done(null, user);
  } catch (err) {
    done(err);
  }
});