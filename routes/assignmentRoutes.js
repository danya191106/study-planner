"use strict";

const express = require("express");

const VALID_STATUSES = new Set(["pending", "in-progress", "completed"]);
const router = express.Router();

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function findAssignment(db, id) {
  return db.prepare(
    `SELECT a.id, a.subject_id AS subjectId, s.name AS subjectName, a.title,
            a.deadline, a.status, a.created_at AS createdAt
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
      WHERE a.id = ?`,
  ).get(id) || null;
}

function createAssignmentRouter(db) {
  if (!db) throw new Error("A SQLite database connection is required.");
  const routes = express.Router();

  routes.get("/subjects", asyncRoute(async (_request, response) => {
    const subjects = db.prepare("SELECT id, name, created_at AS createdAt FROM subjects ORDER BY name").all();
    response.json(subjects);
  }));

  routes.post("/subjects", asyncRoute(async (request, response) => {
    const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
    if (!name || name.length > 80) return response.status(400).json({ error: "Subject name is required and must be 80 characters or fewer." });
    const result = db.prepare("INSERT INTO subjects (name) VALUES (?)").run(name);
    const row = db.prepare("SELECT id, name, created_at AS createdAt FROM subjects WHERE id = ?").get(result.lastInsertRowid);
    response.status(201).json(row);
  }));

  routes.delete("/subjects/:id", asyncRoute(async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) return response.status(400).json({ error: "Subject id must be a positive integer." });
    const subject = db.prepare("SELECT id FROM subjects WHERE id = ?").get(id);
    if (!subject) return response.status(404).json({ error: "Subject not found." });
    const count = db.prepare("SELECT COUNT(*) AS total FROM assignments WHERE subject_id = ?").get(id);
    if (Number(count.total) > 0) return response.status(409).json({ error: "Move or delete this subject’s assignments first." });
    db.prepare("DELETE FROM subjects WHERE id = ?").run(id);
    response.sendStatus(204);
  }));

  routes.get("/assignments", asyncRoute(async (request, response) => {
    const conditions = [];
    const values = [];
    const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
    const status = request.query.status;
    const subjectId = request.query.subjectId;

    if (search) {
      conditions.push("(a.title LIKE ? OR s.name LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.has(status)) return response.status(400).json({ error: "Status must be pending, in-progress, or completed." });
      conditions.push("a.status = ?");
      values.push(status);
    }
    if (subjectId !== undefined) {
      const id = parseId(subjectId);
      if (!id) return response.status(400).json({ error: "subjectId must be a positive integer." });
      conditions.push("a.subject_id = ?");
      values.push(id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const assignments = db.prepare(
      `SELECT a.id, a.subject_id AS subjectId, s.name AS subjectName, a.title,
              a.deadline, a.status, a.created_at AS createdAt
         FROM assignments a
         JOIN subjects s ON s.id = a.subject_id
         ${where}
        ORDER BY a.deadline, a.created_at DESC`,
    ).all(...values);
    response.json(assignments);
  }));

  routes.post("/assignments", asyncRoute(async (request, response) => {
    const { title, subjectId, deadline } = request.body || {};
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const parsedSubjectId = parseId(subjectId);
    const status = request.body?.status ?? "pending";
    if (!cleanTitle || cleanTitle.length > 200) return response.status(400).json({ error: "Assignment name is required and must be 200 characters or fewer." });
    if (!parsedSubjectId) return response.status(400).json({ error: "Choose an existing subject." });
    if (!validDate(deadline)) return response.status(400).json({ error: "Enter a valid deadline in YYYY-MM-DD format." });
    if (!VALID_STATUSES.has(status)) return response.status(400).json({ error: "Choose a valid assignment status." });
    const subject = db.prepare("SELECT id FROM subjects WHERE id = ?").get(parsedSubjectId);
    if (!subject) return response.status(400).json({ error: "Choose an existing subject." });

    const result = db.prepare(
      "INSERT INTO assignments (subject_id, title, deadline, status) VALUES (?, ?, ?, ?)",
    ).run(parsedSubjectId, cleanTitle, deadline, status);
    response.status(201).json(findAssignment(db, result.lastInsertRowid));
  }));

  routes.patch("/assignments/:id", asyncRoute(async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) return response.status(400).json({ error: "Assignment id must be a positive integer." });
    const existing = db.prepare("SELECT id FROM assignments WHERE id = ?").get(id);
    if (!existing) return response.status(404).json({ error: "Assignment not found." });

    const updates = [];
    const values = [];
    const body = request.body || {};
    if (Object.hasOwn(body, "title")) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title || title.length > 200) return response.status(400).json({ error: "Assignment name is required and must be 200 characters or fewer." });
      updates.push("title = ?");
      values.push(title);
    }
    if (Object.hasOwn(body, "subjectId")) {
      const subjectId = parseId(body.subjectId);
      if (!subjectId) return response.status(400).json({ error: "Choose an existing subject." });
      const subject = db.prepare("SELECT id FROM subjects WHERE id = ?").get(subjectId);
      if (!subject) return response.status(400).json({ error: "Choose an existing subject." });
      updates.push("subject_id = ?");
      values.push(subjectId);
    }
    if (Object.hasOwn(body, "deadline")) {
      if (!validDate(body.deadline)) return response.status(400).json({ error: "Enter a valid deadline in YYYY-MM-DD format." });
      updates.push("deadline = ?");
      values.push(body.deadline);
    }
    if (Object.hasOwn(body, "status")) {
      if (!VALID_STATUSES.has(body.status)) return response.status(400).json({ error: "Choose a valid assignment status." });
      updates.push("status = ?");
      values.push(body.status);
    }
    if (!updates.length) return response.status(400).json({ error: "Provide at least one assignment field to update." });

    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE assignments SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    response.json(findAssignment(db, id));
  }));

  routes.delete("/assignments/:id", asyncRoute(async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) return response.status(400).json({ error: "Assignment id must be a positive integer." });
    const result = db.prepare("DELETE FROM assignments WHERE id = ?").run(id);
    if (!result.changes) return response.status(404).json({ error: "Assignment not found." });
    response.sendStatus(204);
  }));

  routes.get("/dashboard/summary", asyncRoute(async (_request, response) => {
    const row = db.prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'pending'), 0) AS pending,
              COALESCE(SUM(status = 'in-progress'), 0) AS inProgress,
              COALESCE(SUM(status = 'completed'), 0) AS completed,
              COALESCE(SUM(status <> 'completed' AND deadline BETWEEN date('now') AND date('now', '+7 days')), 0) AS dueSoon,
              COALESCE(SUM(status <> 'completed' AND deadline < date('now')), 0) AS overdue
         FROM assignments`,
    ).get();
    response.json(row);
  }));

  return routes;
}

module.exports = createAssignmentRouter;