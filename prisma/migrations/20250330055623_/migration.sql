-- DropForeignKey
ALTER TABLE "FileLinks" DROP CONSTRAINT "FileLinks_fileId_fkey";

-- DropForeignKey
ALTER TABLE "FolderLinks" DROP CONSTRAINT "FolderLinks_folderId_fkey";

-- AddForeignKey
ALTER TABLE "FolderLinks" ADD CONSTRAINT "FolderLinks_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileLinks" ADD CONSTRAINT "FileLinks_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
