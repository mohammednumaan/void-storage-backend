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
            const folderPathToDelete = `${folderPath}${folderName}/`;
            // to delete a folder in cloudinary the folder shouldn't contain
            // any resources like images or videos, so we delete all those assets first
            await cloudinary.api.delete_resources_by_prefix(folderPathToDelete.substring(1));
            // at this point we know for sure that the folder is empty, so we
            // simply delete the folder from cloduinary           
            const deleteFolder = await cloudinary.api.delete_folder(folderPathToDelete);
            return deleteFolder;
        } catch(error){
            return next(error);
        }
    }

    static async uploadFileCloudinary(folderPath, dataUri,  next){
        try{                  
            const uploadedFile = await cloudinary.uploader.upload(dataUri, {asset_folder: folderPath, use_asset_folder_as_public_id_prefix: true})
            return uploadedFile;
        } catch(error){
            return next(error);
        }
    }

    static async deleteFileCloudinary(imagePublicId, next){
        try{                  
            const deletedFile = await cloudinary.uploader.destroy(imagePublicId);
            return deletedFile;
        } catch(error){
            return next(error);
        }
    }
}

// exporting the cloudinary class
module.exports = CloudinaryInterface;
