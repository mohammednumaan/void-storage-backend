// imports
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const multer = require("multer");

// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// configuring multer to handle file uploads (this is temporary)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'files/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
      }
  })
const upload = multer({storage}) 

// a list of middlewares to handle a 'file upload' POST request
exports.file_upload_post = [
    upload.single("file"),
    asyncHandler(async (req, res, next) => {
        console.log(req.file)
        const file = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                createdAt: new Date(),
                user: {connect: {id: req.user.id}}
            }
        })
        res.json({file})
    })
]   