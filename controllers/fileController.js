// imports
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const CloudinaryInterface = require('../storage/storage');
const asyncHandler = require("express-async-handler");
const multer = require("multer");


// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// a class with STATIC methods to handle file related 
// operations such as create, read, update, move, copy, delete operations

class FileInterface{
    
    static async #uploadFile(req, res, next){
        console.log(req.file, "FILELEE")
        // extract the parentFolderId from the request body
        // this is the folderId in which the file is getting uploaded
        const {parentFolderId} = req.body;

        // check if the given folder exists in the database
        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {id: parentFolderId}
        ]}})
        
        // if it doesn't, notify the client 
        if (!folder) return res.status(404).json({message: "Folder Does Not Exist!"});

        // else, we upload the new file to cloudinary as
        // well as store meta-data about it in out psql database
        // but first, we need to check if a file with the same name exists
        const file = await prisma.file.findFirst({where: 
            {
                AND: [
                    {fileName: {equals: req.file.originalname}},
                    {folder: {id: folder.id}},
                ]
            }

        })
        // check if we found a file with the same name. If true, notify 
        // the client about the conflict of filenames
        if (file) return res.status(409).json({error: "File Already Exists!"});
        // we need to upload and store the new file in the 
        // psql database as well as in cloudinary
        // to do that, i need to fetch the parent folder's path 
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        // now, we need to dynamically generate the folderPath (IMPORTANT)
        // this path determines the location of the asset in cloudinary
        let newFolderPath = `${parentFolder.folderPath}${parentFolder.folderName}/`;
        if (parentFolder.folderName === 'root'){
            newFolderPath = `${parentFolder.folderPath}${parentFolder.folderName}-${req.user.id}/`
        }

        // since we have a file that is stored as a buffer, we need to upload it to
        // cloudinary by converting it to base64 (since cloudinary only uses string or file paths for upload)
        const base64EncodedImage = Buffer.from(req.file.buffer).toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64EncodedImage}`;
        
        // now we upload it to cloudinary, the response received will contain
        // the uploaded file's path, which we can use to display in the front-end
        const uploadedFile = await CloudinaryInterface.uploadFileCloudinary(newFolderPath, dataUri,  next);
        
        // now, we can safely create/upload the file in the database as well
        // as in cloudinary via the req.file object
        const newFile = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                createdAt: new Date(),
                folder: {connect: {id: folder.id}},
                fileUrl: uploadedFile.url
            }
        })

        // finally, we notify the client about the successfull upload
        return res.json({message: "File Uploaded Successfully!", uploadedFile: newFile});
    } 


    
    static uploadFile(req, res, next){  
        return asyncHandler(() => FileInterface.#uploadFile(req, res, next))()
    }

    // static deleteFile(req, res, next){
    //     return asyncHandler(() => FolderInterface.#deleteFolder(req, res, next))();
    // }

    // static editFolder(req, res, next){
    //     return asyncHandler(() => FolderInterface.#editFolder(req, res, next))();
    // }

}


// exporting the FolderInterface class
module.exports = FileInterface;