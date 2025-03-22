const { body, validationResult } = require("express-validator")
const prisma = require("../prisma")

const validateInput = (type, field) => {

    if (type === "folder"){
        return body(field)
        .trim()
        .notEmpty()
        .withMessage("Folder names must not be empty.").bail()
        .isLength({max: 64})
        .withMessage("Folder names cannot be larger than 64 characters.").bail()
        .matches(/^[A-Za-z0-9-_ ]+$/g)
        .withMessage('Folder names must only contain letters, numbers, hyphens, underscores, and spaces.').bail()
        .custom(async (value, {req}) => {
            const duplicateFolder = await prisma.folder.findFirst({
                where: {
                    parentFolder: req.body.parentFolderId,
                    folderName: value,
                    userId: req.user.id
                }
            })
            if (duplicateFolder) throw new Error("A folder with this name already exists in this directory. Please choose a different name.");
            return true;
        })
        .escape()
    }
    else{
        return body(field)
        .trim()
        .notEmpty()
        .withMessage("File names cannot be empty!").bail()
        .isLength({max: 64})
        .withMessage("File names cannot be larger than 64 characters.").bail()
        .matches(/^[A-Za-z0-9-_ ]+$/g)
        .withMessage('File names must only contain letters, numbers, hyphens, underscores, and spaces.').bail()
        .custom(async (value, {req}) => {

            const file = await prisma.file.findFirst({where: {id: req.body.fileId}});
            const fileName = file.fileName.split(".");
            const fileExt = fileName[fileName.length - 1];

            const duplicateFile = await prisma.file.findFirst({
                where: {
                    folderId: req.body.folderId,
                    fileName: value + '.' + fileExt,
                }
            })
            if (duplicateFile) throw new Error("A file with this name already exists in this directory. Please choose a different name.");
            return true;
        })
        .escape()
    }
}

const getValidationErrors = (req, res, next) => {
    const errors = validationResult(req).array();
    if (errors.length > 0){
        return res.status(400).json({errors: errors});
    }
    next();
}

module.exports = {
    validateInput,
    getValidationErrors
}