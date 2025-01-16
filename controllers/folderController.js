// imports
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const CloudinaryInterface = require('../storage/storage');
const asyncHandler = require("express-async-handler");

// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// a class with STATIC methods to handle folder related 
// operations such as create, read, update, move, copy, delete operations

class FolderInterface{
    
    static async #createFolder(req, res, next){
        console.log("HIII")
        // we first check if there was any validation errors
        const errors = validationResult(req);
        // if there are any validation errors, notify the client
        if (!errors.isEmpty()){
            return res.status(403).json({errors: errors.array()});
        }

        // now, i need to store the file meta-date in the psql database
        // and store the actual file in cloudinary in the right path
        // this path can be determined from the meta-data i stored in the psql database
        const {parentFolderId, newFolderName} = req.body;
        console.log("parent folder", parentFolderId)

        // the first thing to do is to check if a folder with 
        // the same name exists in the database
        const folderExists = await prisma.folder.findFirst({
            where: {
                AND: [ {user: {id: req.user.id}}, {folderId: parentFolderId}, {folderName: newFolderName} ]
            }
        });

        // if true, we notify the client that the folder already exists
        if (folderExists) return res.json({message: "Folder Already Exists!"});

        // else, we create and store the new folder in the 
        // psql database as well as in cloudinary
        // to do that, i need to fetch the folder path 
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

        const newFolder = await prisma.folder.create({
            data: {
                folderName: newFolderName,
                parentFolder: {connect: {id: parentFolderId}},
                createdAt: new Date(),
                files: {},
                user: {connect: {id: req.user.id}},
                folderPath: newFolderPath
            }
        })

        await CloudinaryInterface.createFolderCloudinary(newFolderPath, newFolderName, next);
        return res.json({message: "Folder Created Successfully!", createdFolder: newFolder});
    } 

    static createFolderPost(req, res, next){
        
        return [
            body("folderName").trim().notEmpty().withMessage("Folder name must not be empty!").escape(), 
            asyncHandler(() => FolderInterface.#createFolder(req, res, next))()
        ];
    }
}


// exporting the FolderInterface class
module.exports = FolderInterface;