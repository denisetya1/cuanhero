ALTER TABLE `app_settings`
    CHANGE COLUMN `meta_title` `meta_title_id` VARCHAR(191) NOT NULL DEFAULT '',
    CHANGE COLUMN `meta_description` `meta_description_id` TEXT NOT NULL,
    ADD COLUMN `meta_title_en` VARCHAR(191) NOT NULL DEFAULT '' AFTER `meta_title_id`,
    ADD COLUMN `meta_description_en` TEXT NULL AFTER `meta_description_id`;

UPDATE `app_settings`
SET `meta_description_en` = '';

ALTER TABLE `app_settings`
    MODIFY COLUMN `meta_description_en` TEXT NOT NULL;
