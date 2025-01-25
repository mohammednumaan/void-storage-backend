// imports
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");
const { constructFolderPath, constructPathString } = require('../utils/constructPath');

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
                {parentFolder: parentFolderId},
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

    static async #getAvailableFolders(req, res, next){

        // extract the folder's id the user is in from the request url
        const {folderId} = req.params;

        // check if the folder exists in the database
        const folder = await prisma.folder.findUnique({
            where: {id: folderId}
        })
        
        // if it doesn't exist in the database, we notify the client
        if (!folder) return res.satatus(404).json({message: "Cannot Move Assets/Folders of Unavailable Folder!"});

        // now, we need to select all the folders that is NOT the folder the user is in
        // these are all the available folders where the user can move the new file/folder
        const availableFolders = await prisma.folder.findMany({
            where: {
                AND: [
                    {userId: req.user.id},
                    {id: {not: folder.id}},
                ],

                OR: [{parentFolder: {not: folder.id}}]
            }
        })
        console.log(folder.id, availableFolders)
        return res.json({message: "Available Folders Retrieved Successfully!", folders: availableFolders})
    }

    static async #getFolderPathSegment(req, res, next){
        const {folderId} = req.params;
        const currentFolder = await prisma.folder.findUnique({
            where: {id: folderId}
        })

        if (!currentFolder) return res.status(404).json({message: "Folder Not Found!"});
        const folderPath = await constructFolderPath(currentFolder);
        return res.json({message: "Folder Path Constructed Successfully!", folderSegments: folderPath})
        
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
        let {parentFolderId, newFolderName} = req.body;
        newFolderName = newFolderName.trim();
        
        // we create and store the new folder in the 
        // psql database as well as in cloudinary
        // to do that, i need to fetch the folder path 
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        // now, we need to dynamically generate the folderPath (IMPORTANT)
        // this path determines the location of the asset in cloudinary
        let newFolderPath = await constructPathString(parentFolder, req.user.id);

        const newFolder = await prisma.folder.create({
            data: {
                folderName: newFolderName,
                parent: {connect: {id: parentFolderId}},
                createdAt: new Date(),
                files: {},
                user: {connect: {id: req.user.id}},

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

        // here, i dynamically construct the path of the folder
        let newFolderPath = await constructPathString(folder, req.user.id);
        
        // here, we delete the folder from cloudinary as well
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(newFolderPath, folder.id, next); 
        if (!cloudinaryResponse?.deleted || cloudinaryResponse.deleted.length === 0){
            return res.status(500).json({message: "Failed To Delete Folder!"})
        }
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
        return res.status(204).json({message: "Folder Deleted Successfully!", deletedFolder: cloudinaryResponse.deleted})
    }
    
    static async #editFolder(req, res, next){
        // get the folder we are going to rename/edit
        const folder = await prisma.folder.findUnique({where: {id: req.body.folderId}});

        // check if the folder if we tried to get exists. if it doesn't
        // notify the client that the folder doesn't exist
        if (!folder) return res.status(404).json({error: "Folder Not Found!"});

        const folderPathArray = await constructFolderPath(folder);
        let folderPath = '';

        // here, i dynamically construct the path of the folder
        if (folderPathArray.length === 0){
            folderPath += `root-${req.user.id}/`
        } 
        else{
            for (let i = 0; i < folderPathArray.length; i++){
                if (folderPathArray[i].name == 'root'){
                    folderPath += `/root-${req.user.id}/`
                } else{

                    folderPath += folderPathArray[i].name;
                }
            }
        }

        let folderPathSplit = folderPath.split('/');
        console.log(folderPathSplit)
        folderPathSplit[folderPathSplit.length - 1] = req.body.newFolderName;
        let newFolderPath = folderPathSplit.join('/')
        console.log(folderPath, newFolderPath)

        // we now update/rename the folder name in the database
        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(folderPath.substring(1), newFolderPath.substring(1));
        const renamedFolder = await prisma.folder.update({
            where: {
                id: req.body.folderId,
            },
            data:{
                folderName: req.body.newFolderName
            }
        })
        console.log(cloudinaryResponse)


        return res.json({message: "Folder Renamed Successfully!", renamedFolder})
    }
    static async #moveFolder(req, res, next){

        // extractint the selected folder and file from the request
        const {selectedFolderId, moveData} = req.body;

        // check if the given file and folder exists in the database
        const selectedFolder = await prisma.folder.findUnique({
            where: {id: selectedFolderId}
        });

        const folder = await prisma.folder.findUnique({
            where: {id: moveData}
        });


        
        // if they don't exist, we notify the client    
        if (!selectedFolder) return res.status(404).json({message: "Folder Not Found!"});

        // now, we need to generate the file path dynamically
        let oldFolderPath = await constructPathString(folder, req.user.id);
        let newFolderPath = await constructPathString(selectedFolder, req.user.id);
        newFolderPath += `${folder.folderName}`

        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(oldFolderPath.substring(1), newFolderPath.substring(1));
        if (!cloudinaryResponse){
            return res.status(500).json({message: "An Error Occured!"});
        }

        const movedFolder = await prisma.folder.update({
            where: {id: folder.id},
            data: {
                parentFolder: selectedFolderId
            }
        })

    
        return res.json({message: "File Moved Successfully!", movedFolder})
    }

    static getFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#getFolder(req, res, next))();
    }

    static getRootFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#getRootFolder(req, res, next))();
    }

    static getFolderSegements(req, res, next){
        return asyncHandler(() => FolderInterface.#getFolderPathSegment(req, res, next))();
    }


    static createFolderPost(req, res, next){
        return [
            body("folderName")
                .trim()
                .notEmpty()
                .withMessage("Folder names must not be empty.").bail()
                .isLength({max: 64})
                .withMessage("Folder names cannot be larger than 64 characters.").bail()
                .matches(/^[A-Za-z0-9-_ ]+$/g)
                .withMessage('Folder names must only contain letters, numbers, hyphens, underscores, and spaces.').bail()
                .custom(async (value, {req}) => {
                    const duplicateFolder = await prisma.folder.findUnique({
                        where: {
                            parentFolder: req.body.parentFolderId,
                            folderName: req.body.newFolderName,
                            userId: req.user.id
                        }
                    })

                    if (duplicateFolder) throw new Error("A folder with this name already exists in this directory. Please choose a different name.");
                    return true;
                })
                .escape(), 
            asyncHandler(() => FolderInterface.#createFolder(req, res, next))()
        ];
    }

    static deleteFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#deleteFolder(req, res, next))();
    }

    static editFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#editFolder(req, res, next))();
    }

    static getAvailableFolders(req, res, next){
        return asyncHandler(() => FolderInterface.#getAvailableFolders(req, res, next))();
    }

    static moveFolder(req, res, next){
        return asyncHandler(() => FolderInterface.#moveFolder(req, res, next))();
    }


}


// exporting the FolderInterface class
module.exports = FolderInterface;