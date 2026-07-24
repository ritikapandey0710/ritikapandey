/*
  Warnings:

  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_assigneeId_fkey";

-- DropTable
DROP TABLE "Ticket";

-- DropEnum
DROP TYPE "TicketPriority";

-- DropEnum
DROP TYPE "TicketStatus";
