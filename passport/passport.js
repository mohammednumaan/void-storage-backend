// imports
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { PrismaClient } = require('@prisma/client');

// initialize a prisma client object
const prisma = new PrismaClient();

// define a verify callback that will be later used by the passport f
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

// basic passport setup
const strategy = new LocalStrategy(verifyCallback);
passport.use(strategy);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await prisma.user.findUnique({where : {id: userId}});
    done(null, user);
  } catch (err) {
    done(err);
  }
});