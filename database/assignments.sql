CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subject_id, title),
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments (deadline);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments (status);

INSERT OR IGNORE INTO subjects (name) VALUES ('Web Technology'), ('JavaScript'), ('PHP');

INSERT OR IGNORE INTO assignments (subject_id, title, deadline, status)
VALUES ((SELECT id FROM subjects WHERE name = 'Web Technology'), 'HTML Forms', '2026-09-30', 'completed');

INSERT OR IGNORE INTO assignments (subject_id, title, deadline, status)
VALUES ((SELECT id FROM subjects WHERE name = 'JavaScript'), 'DOM Manipulation', '2026-10-03', 'in-progress');

INSERT OR IGNORE INTO assignments (subject_id, title, deadline, status)
VALUES ((SELECT id FROM subjects WHERE name = 'PHP'), 'Form Validation', '2026-10-05', 'pending');