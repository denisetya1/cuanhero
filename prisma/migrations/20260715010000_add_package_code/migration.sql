ALTER TABLE `packages`
    ADD COLUMN `code` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `packages_code_key` ON `packages`(`code`);
