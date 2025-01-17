// imports
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require('express-validator');
const multer = require("multer");
const { storage }= require("../storage/storage");
const createFolderCloudinary = require('../storage/storage');

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