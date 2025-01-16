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
            next();
        }
    }
}

// exporting the cloudinary class
module.exports = CloudinaryInterface;
