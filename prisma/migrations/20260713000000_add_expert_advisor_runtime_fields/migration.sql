ALTER TABLE `expert_advisors`
  ADD COLUMN `ea_file_name` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `default_config` JSON NULL;
