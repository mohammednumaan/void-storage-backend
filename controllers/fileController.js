// imports
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");
const { constructPathString } = require('../utils/constructPath');
const { validateInput, getValidationErrors } = require('../utils/validateInput');
const prisma = require('../prisma');

const fileInterface = {

    getFiles: asyncHandler(async (req, res) => {
        const { folderId } = req.params;

        const folderExists = await prisma.folder.findFirst({where: {
            id: folderId,
        }})

        if (!folderExists) return res.fail('The folder for which the files were requested cannot be found.', 404);

        const allFiles = await prisma.file.findMany({where: {
            folderId: folderId,
        }})

        return res.success({ allFiles }, 'Files retrieved successfully.');
    }),

    getSpecificFile: asyncHandler(async (req, res) => {
        const {fileId} = req.params;

        const file = await prisma.file.findUnique({where: {id: fileId}});
        if (!file) return res.fail('The requested file cannot be found.', 404);
        return res.success({ file }, 'File retrieved successfully.');
    }),

    validateFile: [
        validateInput("file", "newFileName"),
        getValidationErrors,
    ],

    uploadFile: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const {parentFolderId} = req.body;

        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {id: parentFolderId}
        ]}})
        
        if (!folder) return res.fail('The selected folder for uploading this file could not be found.', 404);

        const file = await prisma.file.findFirst({where: 
            {AND: [
                    {fileName: {equals: req.file.originalname}},
                    {folder: {id: folder.id}},
            ]}
        })

        if (file) return res.fail('The folder already contains a file with the same name. Please rename the file.', 409);

        const mimetype = req.file.mimetype;
        if (mimetype.includes('video') || mimetype.includes('openxml')){
            return res.fail('File type not supported. Please upload a valid file (image, pdf, doc and txt).', 400);
        }

        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        let newFolderPath = await constructPathString(parentFolder, req.user.id);
        const base64EncodedImage = Buffer.from(req.file.buffer).toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64EncodedImage}`;
        const isText = mimetype.includes('text');
        
        const uploadedFile = await CloudinaryInterface.uploadFileCloudinary(newFolderPath, dataUri, isText);
        
        if (!uploadedFile){
            return res.fail('File upload failed.', 500);
        }
        const newFile = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                createdAt: new Date(),
                folder: {connect: {id: folder.id}},
                fileUrl: uploadedFile.secure_url
            }
        })

        return res.success({ uploadedFile: newFile }, 'File uploaded successfully.');
    }),

    editFile: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const {folderId, fileId, newFileName} = req.body;

        const file = await prisma.file.findUnique({
            where: {id: fileId}
        })

        if (!file) return res.fail('The requested file cannot be found.', 404);

        const fileExtension = file.fileName.split('.')[file.fileName.split('.').length - 1];
        
        const renamedFile = await prisma.file.update({
            where: {
                id: fileId,
                folderId: folderId
            }, 
            data: {
                fileName: newFileName + "." + fileExtension
            }
        })

        return res.success({ renamedFile }, 'File renamed successfully.');
    }),

    deleteFile: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const {fileId} = req.body;
        
        const file = await prisma.file.findUnique({where: {id: fileId}})
        if (!file) return res.fail('The requested file to delete cannot be found.', 404);
        
        const publicId = file.fileUrl.split('/');
        const imageName = publicId.pop().split('.')[0];
        const finalImageId = (publicId.slice(7).join('/') + '/' + imageName).replaceAll("%20", " ");
                
        const cloudinaryResponse = await CloudinaryInterface.deleteFileCloudinary(finalImageId);
        if (cloudinaryResponse.result !== 'ok'){
            return res.fail('An error occurred while deleting this file.', 500);
        }

        await prisma.file.delete({
            where: {
                id: fileId     
            }
        })
        return res.success(null, 'File deleted successfully.');
    }),

    moveFile: asyncHandler(async (req, res, next) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }
        const {selectedFolderId, moveData} = req.body;

        const selectedFolder = await prisma.folder.findUnique({where: {id: selectedFolderId}});
        const fileToMove = await prisma.file.findUnique({where: {id: moveData}})

        if (!selectedFolder) return res.fail('The selected folder could not be found.', 404);
        if (!fileToMove) return res.fail('The file to move could not be found.', 404);

        const sameFileNameExists = await prisma.file.findFirst({
            where: {
                AND: [{folderId: selectedFolder.id}, {fileName: fileToMove.fileName}]
            }
        })

        if (sameFileNameExists) return res.fail('A file with the same name already exists in the selected folder.', 403);

        let newFolderPath = await constructPathString(selectedFolder, req.user.id);

        const fileURL = fileToMove.fileUrl.split('/');
        const filePublicId = fileURL.pop().split('.')[0];
        const filePath = fileURL.slice(7).join('/') + '/' +  filePublicId;

        const cloudinaryResponse = await CloudinaryInterface.moveFileCloudinary(filePath, newFolderPath, filePublicId, next);
        if (!cloudinaryResponse){
            return res.fail('An error occurred while moving this file.', 500);
        }

        const updatedFile = await prisma.file.update({
            where: {id: moveData},
            data: {
                folder: {connect: {id: selectedFolder.id}},
                fileUrl: cloudinaryResponse.renamedFile.url
            }
        })
        
        return res.success({ movedFile: updatedFile }, 'File moved successfully.');
    }),

    downloadFile: asyncHandler(async (req, res) => {
        const { fileId } = req.params;
        const file = await prisma.file.findUnique({
            where: {id: fileId}
        })

        if (!file) return res.fail('File could not be found.', 404);

        const imageResponse = await fetch(file.fileUrl);
        if (!imageResponse.ok){
            return res.fail('Something went wrong. Could not fetch file.', 500);
        }

        res.setHeader('Content-Type', imageResponse.headers.get('content-type'));
        res.setHeader('Content-Disposition', `attachment;`);

        const buffer = await imageResponse.arrayBuffer();
        res.send(Buffer.from(buffer));
    }),

    shareFile: asyncHandler(async (req, res) => {
        if (!req?.user?.id){
            return res.fail('Unauthorized user.', 401);
        }

        const { resourceId, duration, unit } = req.body;
        const selectedFile = await prisma.file.findUnique({where: {id: resourceId}});

        if (!duration) return res.fail('Expiry duration needs to be specified.', 400);
        if (!selectedFile) return res.fail('The selected file could not be found.', 404);

        const nowDate = new Date();
        const expiryDate = unit === "hours" ?
             nowDate.setHours(nowDate.getHours() + duration) :
             nowDate.setDate(nowDate.getDate() + duration)
        const newFileLink = await prisma.fileLinks.create({
            data: {
                file: {connect: {id: resourceId}},
                expiresAt: new Date(expiryDate)
            }
        })

        const fileLinkId = `view/public/file/${newFileLink.id}`;
        return res.success({ link: fileLinkId }, 'Link generated successfully.');
    }),

    getSharedFile: asyncHandler(async (req, res) => {
        const { linkId, type } = req.body;

        if (type.toLowerCase() !== "file"){
            return res.fail('The requested resource is not of type file.', 400);
        } 

        const fileLink = await prisma.fileLinks.findUnique({
            where: {id: linkId}
        });
        if (!fileLink) return res.fail('The requested resource could not be found, please request the owner to share a new link.', 404);
        
        const nowDate = new Date();
        if (nowDate > fileLink.expiresAt) return res.fail('The generated link has expired, please request the owner to share a new link.', 400);

        const file = await prisma.file.findUnique({
            where: {id: fileLink.fileId}
        })
        if (!file) return res.fail('The requested file could not be found.', 404);

        return res.success({
            id: file.id,
            type: 'File',
            fileInfo: file,
        }, 'File information fetched successfully.');
    })
}

module.exports = fileInterface;
