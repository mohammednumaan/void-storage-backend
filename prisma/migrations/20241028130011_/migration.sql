/*
  Warnings:

  - You are about to drop the column `userId` on the `File` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[folderId]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `folderId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropIndex
DROP INDEX "File_userId_key";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "userId",
ADD COLUMN     "folderId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "parentFolder" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Folder_userId_key" ON "Folder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "File_folderId_key" ON "File"("folderId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
