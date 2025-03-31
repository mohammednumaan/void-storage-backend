// imports
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const CloudinaryInterface = require("../cloudinary/cloudinary");
const prisma = require("../prisma")

// a list of middlewares to handle a 'register' post request 
exports.register_post = [
    body('username').trim()
        .isLength({min: 5})
        .withMessage("Usernames must be atleast 5 characters long.")
        .custom(async value => {
            const user = await prisma.user.findUnique({where: {username: value}});
            if(user) throw new Error('Username Already Exists!');
            else return true;
        })
        .escape(),

    body('password').trim().isLength({min: 8}).withMessage("Passwords must be atleast 8 characters long.").escape(),
    
    body("confirm_password")
    .custom((value, { req }) => {
        return value === req.body.password
    })
    .withMessage("Passwords Don't Match")
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
            if (!user) return res.json({status: false, message: info.message});
            req.login(user, next);
        })(req, res, next)
    },

    (req, res) => {
        return res.json({status: true, user: req.user.username});
    }
]

exports.logout_post = (req, res, next) => {
    req.logout((err) => {
        if (err) return res.status(500).json({message: 'Failed To Logout.'})
    })

    return res.json({message: "Logged Out Successfully."})
}

exports.post_username = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Usernames must not be empty.")
        .isLength({min: 5})
        .withMessage("Usernames must atleast be 5 characters long.")
        .escape(),

    asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.status(401).json({message: "Unauthorized user."})
        }
        const {username} = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.json({errors: errors.array()});
        }

        const user = await prisma.user.findUnique({
            where: {id: req.user.id}
        });

        if (!user) return res.status(404).json({message: "User could not be found."})
        

        const updatedUser = await prisma.user.update({
            where: {id: user.id},
            data: {
                username
            }
        });

        return res.json({message: "Username updated successfully.", username: updatedUser.username})

    })
]

exports.delete_account = [
    body("password").trim().notEmpty().withMessage("Password must not be empty.").escape(),

    asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.status(401).json({message: "Unauthorized user."})
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }

        const userId = req.user.id;
        if (!userId) return res.status(401).json({message: "Unauthorized user."});
        
        const user = await prisma.user.findUnique({
            where: {id: userId}
        })
        if (!user) return res.status(404).json({message: "User could not be found."});
        
        const isValidPassword = await bcrypt.compare(req.body.password, user.password_hash);
            if (!isValidPassword){
            return res.status(400).json({message: "Incorrect password, failed to delete account."});
        }

        const folder = await prisma.folder.findFirst({
            where: {folderName: 'root', userId: userId}
        })
        if (!folder) return res.status(404).json({message: "Root folder could not be found."});

        const folderPath = `root-${user.id}`
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(folderPath, folderPath);
        if (!cloudinaryResponse?.deleted || cloudinaryResponse.deleted.length === 0){
            return res.status(500).json({message: "Failed To Delete Root Folder!"})
        }
        // now, we can safely delete the root folder and user from the database
        await prisma.folder.delete({
            where: {
                id: folder.id         

            },
            include: {
                files: true,
            }
        })

        await prisma.user.delete({
            where: {
                id: user.id         

            },
            include: {
                folders: true,

            }
        })
        return res.json({message: "User Deleted Successfully!"})
    })
]

// a middleware to handle an 'authenticate' get request
exports.authenticate_get = (req, res, next) => {
    const authenticated = req.isAuthenticated();
    res.json({authenticated, username: authenticated ? req.user.username : null})
}
