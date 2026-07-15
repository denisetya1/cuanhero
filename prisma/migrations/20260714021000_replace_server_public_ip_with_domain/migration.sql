ALTER TABLE `servers`
    ADD COLUMN `domain` VARCHAR(191) NULL;

UPDATE `servers`
SET
    `domain` = `ip_address`,
    `ip_address` = `public_ip`
WHERE `public_ip` IS NOT NULL;

DROP INDEX `servers_public_ip_key` ON `servers`;

ALTER TABLE `servers`
    DROP COLUMN `public_ip`;

CREATE UNIQUE INDEX `servers_domain_key` ON `servers`(`domain`);
