// imports
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");
const { constructFolderPath, constructPathString } = require('../utils/constructPath');
const { validateInput, getValidationErrors } = require('../utils/validateInput');
const prisma = require('../prisma');

// an object that acts as interface to perform folder related operations
const folderInterface = {

    // this method, fetches all sub-folders of the requested folder
    getFolders: asyncHandler(async (req, res, nex) => {
        const {parentFolderId} = req.params;
        const allSubFolders = await prisma.folder.findMany({where: {
            AND: [
                {parentFolder: parentFolderId},
                // {user: {id: req.user.id}}
            ]
        }});
        res.json({message: "All Folders Retrieved Successfully!", folders: allSubFolders});
    }),

    // this method, fetches the root folder of the active user
    getRootFolder: asyncHandler(async (req, res, next) => {
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: 'root'},
                {user: {id: req.user.id}}
            ]
        }});
        return res.json({message: "Root Folder Retrieved Successfully!", rootFolderId: rootFolder.id});
    }),


    // this method, constructs a requested folder's full path which will be
    // used for breadcrumb navigation in the front-end
    getFolderPathSegments: asyncHandler(async (req, res, next) => {
        const {parentFolder, folderId} = req.params;
        const currentFolder = await prisma.folder.findUnique({
            where: {id: folderId}
        })

        
        if (!currentFolder) return res.status(404).json({message: "Folder Not Found!"});
        const folderPath = await constructFolderPath(currentFolder, parentFolder, parentFolder ? false : true);
        return res.json({message: "Folder Path Segments Constructed Successfully!", folderSegments: folderPath})
        
    }),

    // this method, validates the input fields while creating/editing a folder
    validateFolder: [
        validateInput("folder", "newFolderName"),
        getValidationErrors,
    ],  

    // this method, creates a new folder
    createFolder: asyncHandler(async (req, res, next) => {
        // i need to store the file meta-data in the psql database
        // and store the actual file in cloudinary in the right path
        // this path can be determined from the meta-data i stored in the psql database
        let {parentFolderId, newFolderName} = req.body;
        newFolderName = newFolderName.trim();
        
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        const folderExists = await prisma.folder.findFirst({where: {
            folderName: newFolderName,
            parentFolder: parentFolderId
        }})

        // now, we need to dynamically generate the folderPath (IMPORTANT)
        // this path determines the location of the asset in cloudinary
        let newFolderPath = await constructPathString(parentFolder, req.user.id);

        const cloudinaryResponse = await CloudinaryInterface.createFolderCloudinary(newFolderPath, newFolderName, next);
        if (!cloudinaryResponse){
            return res.status(500).json({message: "An error occurred while creating this file."})
        }

        // now, we can safely store the meta-data in the database
        const newFolder = await prisma.folder.create({
            data: {
                folderName: newFolderName,
                parent: {connect: {id: parentFolderId}},
                createdAt: new Date(),
                files: {},
                user: {connect: {id: req.user.id}},

            }
        })
        return res.json({message: "Folder Created Successfully!", createdFolder: newFolder});
    }),

    // this method, renames the requested folder
    editFolder: asyncHandler(async (req, res, next) => {

        const {folderId, newFolderName} = req.body;

        // get the folder we are going to rename/edit
        const folder = await prisma.folder.findUnique({where: {id: folderId}});

        // check if the folder if we tried to get exists. if it doesn't
        // notify the client that the folder doesn't exist
        if (!folder) return res.status(404).json({error: "The folder which you are trying to edit cannot be found!"});

        // dynamically constructing the folder path
        const oldFolderPath = await constructPathString(folder, req.user.id);
        let oldFolderPathArr = oldFolderPath.split('/');

        oldFolderPathArr[oldFolderPathArr.length - 2] = newFolderName;
        let newFolderPath = oldFolderPathArr.join('/')
        // we now update/rename the folder name in cloudinary
        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(oldFolderPath.substring(1), newFolderPath.substring(1, newFolderPath.length - 1), folder.id);

        if (!cloudinaryResponse){
            return res.status(500).json({message: "An error occured while editing this folder."})
        }
        // we can now safely update the meta-data in the database
        const renamedFolder = await prisma.folder.update({
            where: {
                id: folderId
            },
            data:{
                folderName: newFolderName
            }
        })
        return res.json({message: "Folder Renamed Successfully!", renamedFolder})
    }),

    // this method, deletes the requested folder along with its sub-folders and files
    deleteFolder: asyncHandler(async (req, res, next) => {
        // get the folder we are going to delete
        const folder = await prisma.folder.findUnique({where: {id: req.body.folderId}});

        // check if the folder if we tried to get exists. if it doesn't
        // notify the client that the folder doesn't exist
        if (!folder) return res.status(404).json({error: "Folder Not Found!"});

        // here, i dynamically construct the path of the folder
        let newFolderPath = await constructPathString(folder, req.user.id);
        // here, we delete the folder from cloudinary
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(newFolderPath, newFolderPath.substring(1), next); 
        if (!cloudinaryResponse?.deleted || cloudinaryResponse.deleted.length === 0){
            return res.status(500).json({message: "Failed To Delete Folder!"})
        }
        // now, we can safely delete the folder from the database
        await prisma.folder.delete({
            where: {
                id: folder.id         

            },
            include: {
                files: true,
            }
        })
        res.status(204).json({message: "Folder Deleted Successfully!", deletedFolder: cloudinaryResponse.deleted})
    }),

    moveFolder: asyncHandler(async (req, res, next) => {

        // extract the selected folder and the folder to move from the request
        const {selectedFolderId, moveData} = req.body;

        // check if the given folder to move and the selected folder exists in the database
        const selectedFolder = await prisma.folder.findUnique({where: {id: selectedFolderId}});
        const folderToMove = await prisma.folder.findUnique({where: {id: moveData}});

        // if they don't exist, we notify the client    
        if (!selectedFolder) return res.status(404).json({message: "The selected directory to move the folder could not be found."});
        if (!folderToMove) return res.status(404).json({message: "The selected folder to move could not be found."});

        // now, we can safely construct the folder's path dynamically
        let oldFolderPath = await constructPathString(folderToMove, req.user.id);
        let newFolderPath = await constructPathString(selectedFolder, req.user.id);
        newFolderPath += `${folderToMove.folderName}`

        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(oldFolderPath.substring(1), newFolderPath.substring(1), folderToMove.id);
        if (!cloudinaryResponse){
            return res.status(500).json({message: "An Error Occured Moving The Folder!"});
        }

        // finally, we can safely update the meta-data in the database
        const movedFolder = await prisma.folder.update({
            where: {id: folderToMove.id},
            data: {
                parentFolder: selectedFolderId
            }
        })

        return res.json({message: "Folder Moved Successfully!", movedFolder})
    }),

    shareFolder: asyncHandler(async (req, res, next) => {
        const { folderId, duration, unit } = req.body;
        console.log(req.body)
        const selectedFolder = await prisma.folder.findUnique({where: {id: folderId}});

        if (!duration) return res.status(400).json({message: "Expiry duration needs to be specified."});
        if (!selectedFolder) return res.status(404).json({message: "The selected directory to move the folder could not be found."});

        const nowDate = new Date();
        const expiryDate = unit === "hours" ?
             nowDate.setHours(nowDate.getHours() + duration) :
             nowDate.setDate(nowDate.getDate() + duration)
        const newFolderLink = await prisma.folderLinks.create({
            data: {
                folder: {connect: {id: folderId}},
                expiresAt: new Date(expiryDate)
            }
        })

        const folderLinkId = `view/public/folder/${newFolderLink.id}`;
        return res.json({message: "Link generated successfully.", link: folderLinkId });

    }),
    getSharedFolder: asyncHandler(async (req, res, next) => {
        const { linkId, type } = req.body;

        if (type.toLowerCase() !== "folder"){
            return res.status(400).json({message: "The requested resource is not of type folder."});
        } 

        const folderLink = await prisma.folderLinks.findUnique({
            where: {id: linkId}
        });
        if (!folderLink) return res.status(404).json({message: "The requested resource could not be found."});
        
        const nowDate = new Date();

        if (nowDate > folderLink.expiresAt) return res.status(400).json({message: "The generated link has expired, please request the owner to share a new link."})

        const folder = await prisma.folder.findUnique({
            where: {id: folderLink.folderId}
        })
        if (!folder) return res.status(404).json({message: "The requested folder could not be found."});

        return res.json({message: "Folder Information Fetched Successfully", id: folder.id, type: 'Folder', name: folder.folderName})
    })
    
}

// exports
module.exports = folderInterface;