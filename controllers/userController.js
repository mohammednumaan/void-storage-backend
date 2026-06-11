// imports
const { body, validationResult } = require("express-validator");
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
        if (!errors.isEmpty()){
            return res.fail('Validation failed', 400, errors.array());
        }

        const {username, password} = req.body
        const hashedPassword = await bcrypt.hash(password, 10);

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
        return res.success(null, 'Registered successfully');
    })
]

// a list of middlewares to handle a 'login' post request
exports.login_post = [

    body('username').trim().isLength({min: 5}).escape(),
    body('password').trim().isLength({min: 8}).escape(),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.fail('Validation failed', 400, errors.array());
        }
        next();
    },

    (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err);
            if (!user) return res.fail(info?.message || 'Invalid Username Or Password.', 401);
            req.login(user, next);
        })(req, res, next)
    },

    (req, res) => {
        return res.success({ username: req.user.username }, 'Logged in successfully');
    }
]

exports.logout_post = (req, res, next) => {
    req.logout((err) => {
        if (err) return res.fail('Failed to logout', 500);
        return res.success(null, 'Logged out successfully');
    });
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
            return res.fail('Unauthorized user.', 401);
        }
        const {username} = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.fail('Validation failed', 400, errors.array());
        }

        const user = await prisma.user.findUnique({
            where: {id: req.user.id}
        });

        if (!user) return res.fail('User could not be found.', 404);

        const updatedUser = await prisma.user.update({
            where: {id: user.id},
            data: {
                username
            }
        });

        return res.success({ username: updatedUser.username }, 'Username updated successfully.');

    })
]

exports.delete_account = [
    body("password").trim().notEmpty().withMessage("Password must not be empty.").escape(),

    asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.fail('Validation failed', 400, errors.array());
        }

        const userId = req.user.id;
        
        const user = await prisma.user.findUnique({
            where: {id: userId}
        })
        if (!user) return res.fail('User could not be found.', 404);
        
        const isValidPassword = await bcrypt.compare(req.body.password, user.password_hash);
        if (!isValidPassword){
            return res.fail('Incorrect password, failed to delete account.', 400);
        }

        const folder = await prisma.folder.findFirst({
            where: {folderName: 'root', userId: userId}
        })
        if (!folder) return res.fail('Root folder could not be found.', 404);

        const folderPath = `root-${user.id}`
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(folderPath, folderPath);
        if (!cloudinaryResponse?.deleted || cloudinaryResponse.deleted.length === 0){
            return res.fail('Failed to delete root folder.', 500);
        }

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
        return res.success(null, 'User deleted successfully.');
    })
]

exports.authenticate_get = (req, res) => {
    const authenticated = req.isAuthenticated();
    return res.success({
        authenticated,
        username: authenticated ? req.user.username : null,
    }, authenticated ? 'Authenticated' : 'Not authenticated');
}
