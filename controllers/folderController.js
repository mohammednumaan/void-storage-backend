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

    static async #getFolder(req, res, next){

        // extract the parentFolderId from the url in-order to display
        // retrieve of its sub-folders in the database
        const {parentFolderId} = req.params;
        const allSubFolders = await prisma.folder.findMany({where: {
            AND: [
                {folderId: parentFolderId},
                {user: {id: req.user.id}}
            ]
        }});
        res.json({message: "All Folders Retrieved Successfully!", folders: allSubFolders});
        
    }
    
    static async #getRootFolder(req, res, next){

        // retrieve the root folder for the current user
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: 'root'},
                {user: {id: req.user.id}}
            ]
        }});
        return res.json({message: "Root Folder Retrieved Successfully!", rootFolderId: rootFolder.id});
    }
    
    static async #createFolder(req, res, next){
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


    static async #deleteFolder(req, res, next){
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

        // here, we delete the folder from cloudinary as well
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(folder.folderPath, folder.folderName, next);        
        // send a json response to the client indicating 
        // the folder has been deleted successfully
        res.json({message: "Folder Deleted Successfully!", deletedFolder: cloudinaryResponse.deleted})
    }

    static async #editFolder(req, res, next){
        // get the folder we are going to rename/edit
        const folder = await prisma.folder.findUnique({where: {id: req.body.folderId}});

        // check if the folder if we tried to get exists. if it doesn't
        // notify the client that the folder doesn't exist
        if (!folder) return res.status(404).json({error: "Folder Not Found!"});

        // we now update/rename the folder name in the database
        await prisma.folder.update({
            where: {
                id: req.body.folderId,
            },
            data:{
                folderName: req.body.newFolderName
            }
        })

        
    }
    static getFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#getFolder(req, res, next))();
    }

    static getRootFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#getRootFolder(req, res, next))();
    }

    static createFolderPost(req, res, next){
        return [
            body("folderName").trim().notEmpty().withMessage("Folder name must not be empty!").escape(), 
            asyncHandler(() => FolderInterface.#createFolder(req, res, next))()
        ];
    }


    static deleteFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#deleteFolder(req, res, next))();
    }

}


// exporting the FolderInterface class
module.exports = FolderInterface;