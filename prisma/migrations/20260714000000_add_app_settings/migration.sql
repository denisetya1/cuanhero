CREATE TABLE `app_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `whatsapp_number` VARCHAR(191) NOT NULL DEFAULT '',
    `meta_title` VARCHAR(191) NOT NULL DEFAULT '',
    `meta_description` TEXT NOT NULL,
    `order_message_en` TEXT NOT NULL,
    `order_message_id` TEXT NOT NULL,
    `renewal_message_en` TEXT NOT NULL,
    `renewal_message_id` TEXT NOT NULL,
    `consultation_message_en` TEXT NOT NULL,
    `consultation_message_id` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
