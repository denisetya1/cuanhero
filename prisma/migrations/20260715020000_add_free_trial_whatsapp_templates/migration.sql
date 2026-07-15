ALTER TABLE `app_settings`
  ADD COLUMN `free_trial_message_en` TEXT NULL,
  ADD COLUMN `free_trial_message_id` TEXT NULL;

UPDATE `app_settings`
SET
  `free_trial_message_en` = COALESCE(`free_trial_message_en`, ''),
  `free_trial_message_id` = COALESCE(`free_trial_message_id`, '');

ALTER TABLE `app_settings`
  MODIFY `free_trial_message_en` TEXT NOT NULL,
  MODIFY `free_trial_message_id` TEXT NOT NULL;
