CREATE TABLE `subscription_renewal_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trading_account_id` INTEGER NOT NULL,
    `end_date` DATE NOT NULL,
    `reminder_days` INTEGER NOT NULL,
    `recipient_email` VARCHAR(191) NOT NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscription_renewal_notifications_account_end_day_key`(`trading_account_id`, `end_date`, `reminder_days`),
    INDEX `subscription_renewal_notifications_sent_at_idx`(`sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `subscription_renewal_notifications`
    ADD CONSTRAINT `subscription_renewal_notifications_trading_account_id_fkey`
    FOREIGN KEY (`trading_account_id`) REFERENCES `trading_accounts`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
