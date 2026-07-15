CREATE TABLE `payment_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trading_account_id` INTEGER NOT NULL,
    `package_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'IDR',
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'QRIS_STATIC',
    `type` VARCHAR(191) NOT NULL DEFAULT 'ACTIVATION',
    `status` VARCHAR(191) NOT NULL DEFAULT 'APPROVED',
    `previous_end_date` DATE NULL,
    `new_end_date` DATE NULL,
    `paid_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `payment_records_package_id_fkey`(`package_id`),
    INDEX `payment_records_trading_account_id_fkey`(`trading_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_trading_account_id_fkey` FOREIGN KEY (`trading_account_id`) REFERENCES `trading_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
