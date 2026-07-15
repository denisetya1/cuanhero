/*
  Warnings:

  - You are about to drop the column `packageId` on the `trading_accounts` table. All the data in the column will be lost.
  - Added the required column `package_id` to the `trading_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `accounts` MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `expert_advisors` MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `packages` MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `sessions` MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `trading_accounts` DROP COLUMN `packageId`,
    ADD COLUMN `last_sync` DATETIME(3) NULL,
    ADD COLUMN `package_id` INTEGER NOT NULL,
    MODIFY `account_password` VARCHAR(191) NULL,
    MODIFY `account_server` VARCHAR(191) NULL,
    MODIFY `account_name` VARCHAR(191) NULL,
    MODIFY `account_balance` VARCHAR(191) NULL,
    MODIFY `eaConfiguration` LONGTEXT NULL,
    MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `users` MODIFY `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `verifications` MODIFY `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `trading_accounts` ADD CONSTRAINT `trading_accounts_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
