// imports
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require('express-validator');
const multer = require("multer");
const { storage }= require("../storage/storage");
const createFolderCloudinary = require('../storage/storage');

// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// initializing a multer object with the above imported storage configuration
// to handle and store file data
const upload = multer({storage}) 



// a simple middleware to handle a 'edit folder' PUT request
exports.folder_edit = [ 

    // validate the input for security reasons
    body("rename").trim().notEmpty().withMessage("Folder name must not be empty!").escape(),

    // update the folder name
    asyncHandler(async (req, res, next) => {    
        console.log(req.user)
        await prisma.folder.update({
        where: {
            id: req.body.folderId,
        },
        data:{
            folderName: req.body.folderName
        }
        })

        // notify the client about the successfull update
        res.json({message: "Folder Renamed Successfully!"})

})]

// a simple function to handle moving folders
exports.folder_move = (asyncHandler(async (req, res, next) => {
    const {selectedFolderId, currentFolderId} = req.body;
    await prisma.folder.update({
        where: {
            id: currentFolderId
        }, 
        data: {
            folderId: selectedFolderId
        }
    })
}))

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
        res.json({message: `Uploaded The File Successfully!`, uploadedFile: newFile})
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

// a simple middleware to handle a 'file delete' DELETE request 
exports.file_delete = asyncHandler(async (req, res, next) => {

        // get the file we are going to delete
        const file = await prisma.file.findUnique({where: {id: req.body.fileId}});

        // check if the file if we tried to get exists. if it doesn't
        // notify the client that the file doesn't exist
        if (!file) return res.status(404).json({error: "Folder Not Found!"});
    
        // else, we delete the folder from the database
        await prisma.file.delete({
            where: {
                id: req.body.fileId         
    
            }
        })
        // send a json response to the client indicating 
        // the file has been deleted successfully
        res.json({message: "File Deleted Successfully!"})
})

// a simple middleware to handle a 'edit file' PUT request
exports.file_edit = [ 

    // validate the input for security reasons
    body("rename").trim().notEmpty().withMessage("File name must not be empty!").escape(),

    // updates the name of the file
    asyncHandler(async (req, res, next) => {    

        await prisma.file.update({
            where: {
                id: req.body.fileId,
            },
            data:{
                fileName: req.body.fileName
            }
    })

    // notify the client that the update was successfull
    res.json({message: "File Renamed Successfully!"})

})]