// imports
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require('express-validator');
const multer = require("multer");
const { connect } = require('../routes/fileSystem');

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

// initializing a multer object with the above configuration
// to handle and store file data
const upload = multer({storage}) 

// a simple middleware to handle 'folder list' get request
exports.folder_list_get = asyncHandler(async (req, res, next) => {
    
    // contains the folderId requested  
    let {folderId} = req.params;

    // retrieve the root folder of the current user
    // if no folderId is specified
    if (folderId == "root"){
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: "root"},
                {user: {id: req.user.id}}
            ]
        }})
        folderId = rootFolder.id;
    }

    const allFolders = await prisma.folder.findMany({where: {
        AND: [
            {folderId: {equals: folderId}},
            
            {user: {id: req.user.id}}
        ]
    }});
    return res.json({folders: allFolders});
})

// a list of middlewares to handle a 'create folder' POST request
exports.folder_create_post = [
    body("folderName").trim().notEmpty().withMessage("Folder name must not be empty!").escape(),
    asyncHandler(async (req, res, next) => {
        
        // retrieve validation errors from the body (if any)
        const errors = validationResult(req);

        // destructring the request's body for easy access
        let {parentFolderId, folderName} = req.body;

        // if there are any validation errors, notify the client
        if (!errors.isEmpty()){
            return res.status(403).json({errors: errors.array()});
        }

        // retrieve the root folder of the current user
        // if no parentFolderId is specified
        if (parentFolderId == "root"){
            const rootFolder = await prisma.folder.findFirst({where: {
                AND: [
                    {folderName: "root"},
                    {user: {id: req.user.id}}
                ]
            }})
            parentFolderId = rootFolder.id;
        }

        // else, first, check if there are any folders are 
        // present with the same name
        const folder = await prisma.folder.findFirst({where: {
            AND: [
                { folderId: {equals: parentFolderId}}, 
                { folderName: {equals: folderName}}, 
                {user: {id: req.user.id}}
            ]
        }})

        // if true, notify the client to use a different folder name
        if (folder) return res.status(409).json({error: "Folder Already Exists!"});

        // else, we create a new folder and store it in the database
        else{
            const newFolder = await prisma.folder.create({
                data: {
                    folderName,
                    parentFolder: {connect: {id: parentFolderId}},
                    createdAt: new Date(),
                    files: {},
                    user: {connect: {id: req.user.id}}
                }
            })

            // notify the client about the successfull creatiion of the folder
            return res.json({message: "Folder Created Successfully", createdFolder: newFolder});
        }
    })
]

// a simple middleware to handle a 'delete folder' DELETE request
exports.folder_delete = async (req, res, next) => {

    
    // get the folder we are going to delete
    const folder = await prisma.folder.findUnique({where: {id: req.body.folderId}});

    // check if the folder if we tried to get exists. if it doesn't
    // notify the client that the folder doesn't exist
    if (!folder) return res.status(404).json({error: "Folder Not Found!"});

    // else, we delete the folder from the database
    await prisma.folder.delete({
        where: {
            id: folder.id         

        },
        include: {
            files: true
        }
    })
    
    // send a json response to the client indicating 
    // the folder has been deleted successfully
    res.json({message: "Folder Deleted Successfully!"})
    
}

// a list of middlewares to handle a 'file upload' POST request
exports.file_upload_post = [
    upload.single("file"),
    async (req, res, next) => {
        
        // get the folder data in which we are going to try storing the uploaded file
        if (req.body.parentFolder == 'root'){
            const rootFolder = await prisma.folder.findFirst({where: {
                AND: [
                    {folderName: "root"},
                    {user: {id: req.user.id}}
                ]
            }})
            req.body.parentFolder = rootFolder.id;
        }
        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {id: req.body.parentFolder}
        ]}})

        // get file (if exists) with the same name as the uploaded file
        const file = await prisma.file.findFirst({where: 

            {
                AND: [
                    {fileName: {equals: req.file.originalname}},
                    {folder: {id: folder.id}},
                ]
            }

        })
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

// a simple middleware to handle a 'file' GET request
exports.file_list_get = asyncHandler(async (req, res, next) => {

    // contains the folderId that was requested
    let {folderId} = req.params;

    // retrieve the root folder of the current user
    // if no folderId is specified
    console.log("file", folderId)
    if (folderId == "root"){
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: "root"},
                {user: {id: req.user.id}}
            ]
        }})
        console.log(rootFolder)
        folderId = rootFolder.id;
    }


    const folder = await prisma.folder.findFirst({where: {
        AND: [
            {id: {equals: folderId}}, 
            {user: {id: req.user.id}}
        ]
    }})

    const allFiles = await prisma.file.findMany({where: {folderId: {equals: folder.id}},
        include: {folder: true}
    });
    return res.json({files: allFiles});
})

// a simple middlewre to handle a single 'file' GET request
exports.file_get = asyncHandler(async (req, res, next) => {

    // contains the file and folder id that was requested
    let {fileId, folderId} = req.params;

    // retrieve the root folder of the current user
    // if no folderId is specified
    if (folderId == "root"){
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: "root"},
                {user: {id: req.user.id}}
            ]
        }})
        folderId = rootFolder.id;
    }

    const folder = await prisma.folder.findFirst({where: {
        AND: [
            {id: {equals: folderId}}, 
            {user: {id: req.user.id}}
        ]
    }})
    const file = await prisma.file.findFirst({where: {
        AND: [
            {id: {equals: fileId}},
            {folderId: {equals: folder.id}},
        ]
    }})

    res.json({file})
})  