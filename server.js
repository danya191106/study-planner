"use strict";

const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const createAssignmentRouter = require("./routes/assignmentRoutes");

const frontendDirectory = __dirname;
const databaseFile = path.join(__dirname, "study_planner.db");
const schemaFile = path.join(__dirname, "assignments.sql");

function createApp(db) {
  if (!db) throw new Error("A SQLite database connection is required.");

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", createAssignmentRouter(db));
  app.use("/api", (_request, response) => response.status(404).json({ error: "API route not found" }));
  app.use(express.static(frontendDirectory));
  app.use((request, response) => {
    if (request.method === "GET") return response.sendFile(path.join(frontendDirectory, "index.html"));
    return response.status(404).json({ error: "Route not found" });
  });
  app.use((error, _request, response, _next) => {
    if (response.headersSent) return;
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return response.status(409).json({ error: "That subject already exists." });
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") return response.status(400).json({ error: "Choose an existing subject." });
    console.error("Study planner request failed:", error.message);
    response.status(500).json({ error: "The request could not be completed. Check the server and database." });
  });
  return app;
}

function initializeDatabase() {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  const db = new Database(databaseFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(schemaFile, "utf8");
  db.exec(schema);

  return db;
}

async function startServer() {
  const db = initializeDatabase();
  const port = Number(process.env.PORT) || 5000;
  const server = createApp(db).listen(port, "0.0.0.0", () => {
    console.log(`Study planner listening on port ${port}`);
  });
  server.on("close", () => db.close());
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp, startServer };