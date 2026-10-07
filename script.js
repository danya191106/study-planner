"use strict";

const STATUS_LABELS = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
};

const state = {
  subjects: [],
  assignments: [],
  summary: { total: 0, pending: 0, inProgress: 0, completed: 0, dueSoon: 0, overdue: 0 },
  status: "all",
  search: "",
  subjectId: "",
  editingId: null,
};

const byId = (id) => document.getElementById(id);
const assignmentDialog = byId("assignment-dialog");
const subjectsDialog = byId("subjects-dialog");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

async function api(path, options = {}) {
  const API_BASE = "https://study-planner-0tx9.onrender.com";
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

function showAlert(message) {
  const alert = byId("app-alert");
  alert.textContent = message;
  alert.hidden = !message;
}

function localDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDeadline(value) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (value.slice(0, 10) === localDateString()) return "Today";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function isOverdue(assignment) {
  return assignment.status !== "completed" && assignment.deadline.slice(0, 10) < localDateString();
}

async function loadData() {
  try {
    const [subjects, assignments, summary] = await Promise.all([
      api("/subjects"),
      api("/assignments"),
      api("/dashboard/summary"),
    ]);
    state.subjects = subjects;
    state.assignments = assignments;
    state.summary = summary;
    showAlert("");
    render();
  } catch (error) {
    showAlert(error.message || "Your study data could not be loaded. Check the server and database connection.");
    byId("assignment-list").innerHTML = '<p class="list-message"><strong>We couldn’t load your list.</strong>Check the server and MySQL connection, then reload.</p>';
  }
}

function renderSummary() {
  byId("summary-total").textContent = state.summary.total ?? 0;
  byId("summary-completed").textContent = state.summary.completed ?? 0;
  byId("summary-subjects").textContent = state.subjects.length;
  byId("summary-due-soon").textContent = state.summary.dueSoon ?? 0;
  byId("summary-overdue").textContent = state.summary.overdue ?? 0;
  byId("count-all").textContent = state.summary.total ?? 0;
  byId("count-pending").textContent = state.summary.pending ?? 0;
  byId("count-in-progress").textContent = state.summary.inProgress ?? 0;
  byId("count-completed").textContent = state.summary.completed ?? 0;
}

function renderSubjectOptions() {
  const selected = byId("filter-subject").value;
  byId("filter-subject").innerHTML = '<option value="">All subjects</option>' + state.subjects
    .map((subject) => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join("");
  if (state.subjects.some((subject) => String(subject.id) === selected)) byId("filter-subject").value = selected;

  const subjectSelect = byId("assignment-subject");
  subjectSelect.innerHTML = state.subjects
    .map((subject) => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join("");
}

function visibleAssignments() {
  const search = state.search.trim().toLocaleLowerCase();
  return state.assignments.filter((assignment) => {
    const matchesSearch = !search || `${assignment.title} ${assignment.subjectName}`.toLocaleLowerCase().includes(search);
    const matchesStatus = state.status === "all" || assignment.status === state.status;
    const matchesSubject = !state.subjectId || String(assignment.subjectId) === state.subjectId;
    return matchesSearch && matchesStatus && matchesSubject;
  });
}

function renderAssignments() {
  const list = byId("assignment-list");
  const assignments = visibleAssignments();
  if (!assignments.length) {
    const hasFilter = state.search || state.subjectId || state.status !== "all";
    list.innerHTML = hasFilter
      ? '<p class="list-message"><strong>Nothing in this view yet.</strong>Try changing a filter or search for something else.</p>'
      : '<p class="list-message"><strong>A fresh page.</strong>Add your first assignment and give future-you a little clarity.</p>';
    return;
  }

  list.innerHTML = assignments.map((assignment) => {
    const overdue = isOverdue(assignment);
    const date = formatDeadline(assignment.deadline);
    const statusClass = assignment.status.replace(/[^a-z-]/g, "");
    return `<article class="assignment-row" data-assignment-id="${assignment.id}">
      <button class="status-toggle status-${statusClass}" type="button" data-action="cycle-status" aria-label="Change status from ${STATUS_LABELS[assignment.status]} for ${escapeHtml(assignment.title)}" title="Change status">${assignment.status === "completed" ? "✓" : assignment.status === "in-progress" ? "•" : "✓"}</button>
      <div class="assignment-info">
        <div class="assignment-title-line">
          <span class="assignment-title ${assignment.status === "completed" ? "is-completed" : ""}">${escapeHtml(assignment.title)}</span>
          ${overdue ? '<span class="overdue-badge">Overdue</span>' : ""}
        </div>
        <p class="assignment-meta ${overdue ? "is-overdue" : ""}">${escapeHtml(assignment.subjectName)}<span class="dot">·</span>${escapeHtml(date)}</p>
      </div>
      <span class="status-badge status-${statusClass}">${STATUS_LABELS[assignment.status]}</span>
      <div class="row-actions">
        <button class="action-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(assignment.title)}" title="Edit">✎</button>
        <button class="action-button delete" type="button" data-action="delete" aria-label="Delete ${escapeHtml(assignment.title)}" title="Delete">×</button>
      </div>
    </article>`;
  }).join("");
}

function renderSubjects() {
  const counts = new Map();
  state.assignments.forEach((assignment) => counts.set(assignment.subjectId, (counts.get(assignment.subjectId) || 0) + 1));
  byId("subject-list").innerHTML = state.subjects.length
    ? state.subjects.map((subject) => {
      const count = counts.get(subject.id) || 0;
      return `<div class="subject-card">
        <span class="subject-dot" aria-hidden="true"></span>
        <span class="subject-name">${escapeHtml(subject.name)}</span>
        <span class="subject-count">${count} ${count === 1 ? "assignment" : "assignments"}</span>
        <button class="subject-delete" type="button" data-delete-subject="${subject.id}" ${count ? "disabled" : ""} title="${count ? "Delete this subject's assignments first" : "Delete subject"}">Delete</button>
      </div>`;
    }).join("")
    : '<p class="list-message">No subjects yet. Add one above to get started.</p>';
}

function render() {
  renderSummary();
  renderSubjectOptions();
  renderAssignments();
  renderSubjects();
  document.querySelectorAll(".status-tab").forEach((tab) => {
    const selected = tab.dataset.status === state.status;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
}

function openSubjects() {
  byId("subject-error").hidden = true;
  subjectsDialog.showModal();
  byId("subject-name").focus();
}

function openAssignment(assignment = null) {
  if (!state.subjects.length) {
    openSubjects();
    byId("subject-error").textContent = "Add a subject before creating an assignment.";
    byId("subject-error").hidden = false;
    return;
  }
  state.editingId = assignment?.id ?? null;
  const form = byId("assignment-form");
  form.reset();
  byId("assignment-error").hidden = true;
  byId("assignment-kicker").textContent = assignment ? "Make a change" : "New commitment";
  byId("assignment-dialog-title").textContent = assignment ? "Edit assignment" : "Add an assignment";
  byId("save-assignment").textContent = assignment ? "Save changes" : "Add assignment";
  byId("assignment-subject").value = String(assignment?.subjectId ?? state.subjects[0].id);
  form.elements.deadline.value = assignment?.deadline.slice(0, 10) || localDateString();
  form.elements.title.value = assignment?.title ?? "";
  form.elements.status.value = assignment?.status ?? "pending";
  assignmentDialog.showModal();
  form.elements.title.focus();
}

function nextStatus(status) {
  return status === "pending" ? "in-progress" : status === "in-progress" ? "completed" : "pending";
}

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => byId(button.dataset.closeDialog).close());
});
byId("manage-subjects").addEventListener("click", openSubjects);
byId("mobile-subjects").addEventListener("click", openSubjects);
byId("add-assignment").addEventListener("click", () => openAssignment());
byId("search-assignments").addEventListener("input", (event) => {
  state.search = event.currentTarget.value;
  renderAssignments();
});
byId("filter-subject").addEventListener("change", (event) => {
  state.subjectId = event.currentTarget.value;
  renderAssignments();
});
document.querySelectorAll(".status-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.status = tab.dataset.status;
    render();
  });
});

byId("assignment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = byId("save-assignment");
  const data = {
    title: form.elements.title.value.trim(),
    subjectId: Number(form.elements.subjectId.value),
    deadline: form.elements.deadline.value,
    status: form.elements.status.value,
  };
  button.disabled = true;
  byId("assignment-error").hidden = true;
  try {
    const editing = state.editingId !== null;
    await api(`/assignments${editing ? `/${state.editingId}` : ""}`, {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(data),
    });
    assignmentDialog.close();
    await loadData();
  } catch (error) {
    byId("assignment-error").textContent = error.message;
    byId("assignment-error").hidden = false;
  } finally {
    button.disabled = false;
  }
});

byId("subject-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = event.currentTarget.elements.name;
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  byId("subject-error").hidden = true;
  try {
    await api("/subjects", { method: "POST", body: JSON.stringify({ name: input.value.trim() }) });
    input.value = "";
    await loadData();
    input.focus();
  } catch (error) {
    byId("subject-error").textContent = error.message;
    byId("subject-error").hidden = false;
  } finally {
    button.disabled = false;
  }
});

byId("assignment-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest("[data-assignment-id]");
  const assignment = state.assignments.find((item) => item.id === Number(row.dataset.assignmentId));
  if (!assignment) return;
  try {
    if (button.dataset.action === "edit") {
      openAssignment(assignment);
    } else if (button.dataset.action === "delete") {
      if (!window.confirm(`Delete “${assignment.title}”? This cannot be undone.`)) return;
      await api(`/assignments/${assignment.id}`, { method: "DELETE" });
      await loadData();
    } else if (button.dataset.action === "cycle-status") {
      await api(`/assignments/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus(assignment.status) }),
      });
      await loadData();
    }
  } catch (error) {
    showAlert(error.message || "That change could not be saved.");
  }
});

byId("subject-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-subject]");
  if (!button || button.disabled) return;
  const subject = state.subjects.find((item) => item.id === Number(button.dataset.deleteSubject));
  if (!subject || !window.confirm(`Remove “${subject.name}” from your subjects?`)) return;
  try {
    await api(`/subjects/${subject.id}`, { method: "DELETE" });
    await loadData();
  } catch (error) {
    byId("subject-error").textContent = error.message;
    byId("subject-error").hidden = false;
  }
});

loadData();
