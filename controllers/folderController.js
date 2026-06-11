// imports
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");
const { constructFolderPath, constructPathString } = require('../utils/constructPath');
const { validateInput, getValidationErrors } = require('../utils/validateInput');
const prisma = require('../prisma');

const folderInterface = {

    getFolders: asyncHandler(async (req, res) => {
        const {parentFolderId} = req.params;
        const allSubFolders = await prisma.folder.findMany({where: {
            AND: [
                {parentFolder: parentFolderId},
            ]
        }});
        return res.success({ folders: allSubFolders }, 'All folders retrieved successfully.');
    }),

    getRootFolder: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const rootFolder = await prisma.folder.findFirst({where: {
            AND: [
                {folderName: 'root'},
                {user: {id: req.user.id}}
            ]
        }});
        if (!rootFolder) return res.fail('Root folder not found.', 404);
        return res.success({ rootFolderId: rootFolder.id }, 'Root folder retrieved successfully.');
    }),

    getFolderPathSegments: asyncHandler(async (req, res) => {
        const { folderId } = req.params;
        const currentFolder = await prisma.folder.findUnique({
            where: {id: folderId}
        })

        if (!currentFolder) return res.fail('Folder not found.', 404);
        const folderPath = await constructFolderPath(currentFolder, null, true);
        return res.success({ folderSegments: folderPath }, 'Folder path segments constructed successfully.');
    }),

    validateFolder: [
        validateInput("folder", "newFolderName"),
        getValidationErrors,
    ],  

    createFolder: asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        let {parentFolderId, newFolderName} = req.body;
        newFolderName = newFolderName.trim();
        
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        let newFolderPath = await constructPathString(parentFolder, req.user.id);

        const cloudinaryResponse = await CloudinaryInterface.createFolderCloudinary(newFolderPath, newFolderName, next);
        if (!cloudinaryResponse){
            return res.fail('An error occurred while creating this folder.', 500);
        }

        const newFolder = await prisma.folder.create({
            data: {
                folderName: newFolderName,
                parent: {connect: {id: parentFolderId}},
                createdAt: new Date(),
                files: {},
                user: {connect: {id: req.user.id}},
            }
        })
        return res.success({ createdFolder: newFolder }, 'Folder created successfully.');
    }),

    editFolder: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }

        const {folderId, newFolderName} = req.body;
        const folder = await prisma.folder.findUnique({where: {id: folderId}});

        if (!folder) return res.fail('The folder which you are trying to edit cannot be found.', 404);

        const oldFolderPath = await constructPathString(folder, req.user.id);
        let oldFolderPathArr = oldFolderPath.split('/');

        oldFolderPathArr[oldFolderPathArr.length - 2] = newFolderName;
        let newFolderPath = oldFolderPathArr.join('/')
        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(oldFolderPath.substring(1), newFolderPath.substring(1, newFolderPath.length - 1), folder.id);

        if (!cloudinaryResponse){
            return res.fail('An error occurred while editing this folder.', 500);
        }
        const renamedFolder = await prisma.folder.update({
            where: {
                id: folderId
            },
            data:{
                folderName: newFolderName
            }
        })
        return res.success({ renamedFolder }, 'Folder renamed successfully.');
    }),

    deleteFolder: asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const folder = await prisma.folder.findUnique({where: {id: req.body.folderId}});

        if (!folder) return res.fail('Folder not found.', 404);

        let newFolderPath = await constructPathString(folder, req.user.id);
        const cloudinaryResponse = await CloudinaryInterface.deleteFolderCloudinary(newFolderPath, newFolderPath.substring(1), next); 
        if (!cloudinaryResponse?.deleted || cloudinaryResponse.deleted.length === 0){
            return res.fail('Failed to delete folder.', 500);
        }
        await prisma.folder.delete({
            where: {
                id: folder.id         
            },
            include: {
                files: true,
            }
        })
        return res.success({ deletedFolder: cloudinaryResponse.deleted }, 'Folder deleted successfully.');
    }),

    moveFolder: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }

        const {selectedFolderId, moveData} = req.body;
        const selectedFolder = await prisma.folder.findUnique({where: {id: selectedFolderId}});
        const folderToMove = await prisma.folder.findUnique({where: {id: moveData}});

        if (!selectedFolder) return res.fail('The selected directory to move the folder could not be found.', 404);
        if (!folderToMove) return res.fail('The selected folder to move could not be found.', 404);

        let oldFolderPath = await constructPathString(folderToMove, req.user.id);
        let newFolderPath = await constructPathString(selectedFolder, req.user.id);
        newFolderPath += `${folderToMove.folderName}`

        const cloudinaryResponse = await CloudinaryInterface.renameFolderCloudinary(oldFolderPath.substring(1), newFolderPath.substring(1), folderToMove.id);
        if (!cloudinaryResponse){
            return res.fail('An error occurred moving the folder.', 500);
        }

        const movedFolder = await prisma.folder.update({
            where: {id: folderToMove.id},
            data: {
                parentFolder: selectedFolderId
            }
        })

        return res.success({ movedFolder }, 'Folder moved successfully.');
    }),

    shareFolder: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const { resourceId, duration, unit } = req.body;
        const selectedFolder = await prisma.folder.findUnique({where: {id: resourceId}});

        if (!duration) return res.fail('Expiry duration needs to be specified.', 400);
        if (!selectedFolder) return res.fail('The selected directory could not be found.', 404);

        const nowDate = new Date();
        const expiryDate = unit === "hours" ?
             nowDate.setHours(nowDate.getHours() + duration) :
             nowDate.setDate(nowDate.getDate() + duration)
        const newFolderLink = await prisma.folderLinks.create({
            data: {
                folder: {connect: {id: resourceId}},
                expiresAt: new Date(expiryDate)
            }
        })

        const folderLinkId = `view/public/folder/${newFolderLink.id}`;
        return res.success({ link: folderLinkId }, 'Link generated successfully.');
    }),

    getSharedFolder: asyncHandler(async (req, res) => {
        const { linkId, type } = req.body;

        if (type.toLowerCase() !== "folder"){
            return res.fail('The requested resource is not of type folder.', 400);
        } 

        const folderLink = await prisma.folderLinks.findUnique({
            where: {id: linkId}
        });
        if (!folderLink) return res.fail('The requested resource could not be found, please request the owner to share a new link.', 404);
        
        const nowDate = new Date();

        if (nowDate > folderLink.expiresAt) return res.fail('The generated link has expired, please request the owner to share a new link.', 400);

        const folder = await prisma.folder.findUnique({
            where: {id: folderLink.folderId}
        })
        if (!folder) return res.fail('The requested folder could not be found.', 404);

        return res.success({
            id: folder.id,
            type: 'Folder',
            name: folder.folderName,
        }, 'Folder information fetched successfully.');
    })
}

module.exports = folderInterface;
