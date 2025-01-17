// imports
const { CloudinaryStorage } = require('@fluidjs/multer-cloudinary');
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
dotenv.config();

// configuring cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// a STATIC cloudinary class to manage cloudinary related operations
// such as create, delete, update and read operations
class CloudinaryInterface{

    static async createFolderCloudinary(folderPath, newFolderName, next){
        try{
            const newFolderPath = `${folderPath}/${newFolderName}`;
            const folder = await cloudinary.api.create_folder(newFolderPath);
            return folder;
        } catch(error){
            next(error);
        }
    }

    static async deleteFolderCloudinary(folderPath, folderName, next){
        try{
            const folderPathToDelete = `${folderPath}/`;
            const deleteFolder = await cloudinary.api.delete_folder(folderPathToDelete);
            return deleteFolder;
        } catch(error){
            next(error);
        }
    }

    static async uploadFileCloudinary(folderPath, dataUri,  next){
        try{                  
            const uploadedFile = await cloudinary.uploader.upload(dataUri, {folder: folderPath})
            return uploadedFile;
        } catch(error){
            return next(error);
        }
    }
}

// exporting the cloudinary class
module.exports = CloudinaryInterface;
