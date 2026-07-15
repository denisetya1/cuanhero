ALTER TABLE `packages`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `features` JSON NULL,
  ADD COLUMN `discount_percent` INTEGER NULL;
