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
    async (req, res, next) => {
        
        // get the folder data in which we are going to try storing the uploaded file
        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {folderName: 'root'}
        ]}})

        // get file (if exists) with the same name as the uploaded file
        const file = await prisma.file.findFirst({where: {fileName: req.file.originalname}})
        // check if we found a file with the same name. If true, return an error message 
        // indicating conflict of filenames
        if (file) return res.status(409).json({error: "File Already Exists!"});

        
        // Else, create and store the new file data into the folder
        // we retrieved above
        const newFile = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                createdAt: new Date(),
                folder: {connect: {id: folder.id}}
            }
        })

        // send a json response to the client indicating 
        // the file has been uploaded successfully
        res.json({message: `Uploaded The File Successfully!`})
    }
]   