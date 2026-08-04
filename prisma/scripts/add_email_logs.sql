-- Nomor migrasi manual untuk tabel `email_logs`
-- Dibuat 2026-08-04. Apply via: npx prisma db execute --file prisma/scripts/add_email_logs.sql
-- CATATAN: Database ini memiliki drift migration history; gunakan db execute (non-destruktif),
-- bukan prisma migrate dev/reset, untuk menghindari kehilangan data.

CREATE TABLE IF NOT EXISTS `email_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT UNSIGNED NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `recipient_role` VARCHAR(20) NOT NULL DEFAULT 'applicant',
  `subject` VARCHAR(255) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'sent',
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_logs_dedup` (`submission_id`, `event_type`, `recipient_role`, `recipient_email`),
  KEY `email_logs_recipient_email_created_at_index` (`recipient_email`, `created_at`),
  KEY `email_logs_submission_id_foreign` (`submission_id`),
  CONSTRAINT `email_logs_submission_id_foreign` FOREIGN KEY (`submission_id`)
    REFERENCES `service_submissions` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;