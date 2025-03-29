const asyncHandler = require('express-async-handler');
const prisma = require('../prisma');

const commonControllerInterface = {
    getSharedResource: asyncHandler(async (req, res, next) => {
        const {linkId} = req.params;

        const fileLinkExists = await prisma.fileLinks.findUnique({
            where: {id: linkId}
        });

        const folderLinkExists = await prisma.folderLinks.findUnique({
            where: {id: linkId}
        });

        if (!fileLinkExists && !folderLinkExists){
            return res.status(404).json({message: "The requested resource could not be found."});
        }

        

    })
}