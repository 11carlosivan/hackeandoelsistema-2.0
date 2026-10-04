-- SQL helper for creating forms and form_submissions tables in MySQL
CREATE TABLE IF NOT EXISTS forms (
  id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  fields_json JSON NOT NULL,
  max_responses INT NULL,
  submit_button_text VARCHAR(120) NULL DEFAULT 'Enviar Postulación',
  success_message TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX idx_forms_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_submissions (
  id VARCHAR(36) NOT NULL,
  form_id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NULL,
  data_json JSON NOT NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX idx_form_submissions_form_created (form_id, created_at),
  INDEX idx_form_submissions_post_id (post_id),
  CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
