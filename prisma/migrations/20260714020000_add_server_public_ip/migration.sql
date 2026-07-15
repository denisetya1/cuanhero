ALTER TABLE `servers`
    ADD COLUMN `public_ip` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `servers_public_ip_key` ON `servers`(`public_ip`);
