CREATE TABLE `cms_pages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_id` VARCHAR(191) NOT NULL,
    `content_en` LONGTEXT NOT NULL,
    `content_id` LONGTEXT NOT NULL,
    `meta_title_en` VARCHAR(191) NOT NULL DEFAULT '',
    `meta_title_id` VARCHAR(191) NOT NULL DEFAULT '',
    `meta_description_en` TEXT NOT NULL,
    `meta_description_id` TEXT NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `cms_pages_slug_key`(`slug`),
    INDEX `cms_pages_published_updated_idx`(`is_published`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
