/*
  Warnings:

  - You are about to drop the column `folderId` on the `Folder` table. All the data in the column will be lost.
  - You are about to drop the column `folderPath` on the `Folder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_folderId_fkey";

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "folderId",
DROP COLUMN "folderPath",
ADD COLUMN     "parentFolder" TEXT;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentFolder_fkey" FOREIGN KEY ("parentFolder") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
