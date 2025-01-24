// imports
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const CloudinaryInterface = require("../cloudinary/cloudinary");

// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// a list of middlewares to handle a 'register' post request 
exports.register_post = [
    body('username').trim().isLength({min: 5}).escape().custom(async value => {
        const user = await prisma.user.findUnique({where: {username: value}});
        if(user) throw new Error('Username Already Exists!');
        else return true;
    }),

    body('password').trim().isLength({min: 8}).escape(),
    
    body("confirm_password")
    .custom((value, { req }) => {
        return value === req.body.password
    })
    .trim()
    .escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        const {username, password} = req.body
        console.log(username, password, req.body.confirm_password);

        const hashedPassword = await bcrypt.hash(password, 10);
        if (!errors.isEmpty()){
            res.json({
                status: false,
                errors: errors.array()
            })
        } 
        
        else{

            const user = await prisma.user.create({
                data: {
                    username: username,
                    password_hash: hashedPassword,
                }
            })
            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    folders: {
                        create: {
                            folderName: 'root',
                            files: {},
                            createdAt: new Date(),
                        }
                    }
                }
            })

            await CloudinaryInterface.createFolderCloudinary('', `root-${user.id}`, next)
            res.json({status: true});
        }
    })
]

// a list of middlewares to handle a 'login' post request
exports.login_post = [

    body('username').trim().isLength({min: 5}).escape(),
    body('password').trim().isLength({min: 8}).escape(),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.json({status: false, errors: errors.array()});
        }
        next();
    },

    (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err);
            if (!user) return res.json({status: false, errors: info.message});
            req.login(user, next);
        })(req, res, next)
    },

    (req, res) => {
        return res.json({status: true, user: req.user.username});
    }
]

// a middleware to handle an 'authenticate' get request
exports.authenticate_get = (req, res, next) => {
    const authenticated = req.isAuthenticated();
    res.json({authenticated, username: authenticated ? req.user.username : null})
}
