const signupBtn = document.getElementById("signup");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const addNoteBtn = document.getElementById("add-note");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMeCheckbox = document.getElementById("remember-me");

const noteTitleInput = document.getElementById("note-title");
const noteInput = document.getElementById("note-input");
const notesList = document.getElementById("notes-list");

const authMessage = document.getElementById("auth-message");
const authSection = document.getElementById("auth-section");
const noteSection = document.getElementById("note-section");

let currentUser = null;

function loadUsers() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function showNotes() {
  authSection.classList.add("hidden");
  noteSection.classList.remove("hidden");
  renderNotes();
}

function renderNotes() {
  const users = loadUsers();
  const user = users[currentUser];
  notesList.innerHTML = "";

  user.notes.forEach((note, index) => {
    const li = document.createElement("li");

    if (note.editing) {
      const titleInput = document.createElement("input");
      titleInput.value = note.title;

      const contentInput = document.createElement("textarea");
      contentInput.value = note.content;

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.onclick = () => {
        note.title = titleInput.value;
        note.content = contentInput.value;
        note.timestamp = new Date().toLocaleString();
        delete note.editing;
        saveUsers(users);
        renderNotes();
      };

      li.classList.add("editing");
      li.appendChild(titleInput);
      li.appendChild(contentInput);
      li.appendChild(saveBtn);
    } else {
      const title = document.createElement("div");
      title.className = "note-title";
      title.textContent = note.title;

      const content = document.createElement("div");
      content.textContent = note.content;

      const time = document.createElement("div");
      time.className = "note-time";
      time.textContent = note.timestamp;

      const actions = document.createElement("div");
      actions.className = "note-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = () => {
        note.editing = true;
        saveUsers(users);
        renderNotes();
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = () => {
        user.notes.splice(index, 1);
        saveUsers(users);
        renderNotes();
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(title);
      li.appendChild(content);
      li.appendChild(time);
      li.appendChild(actions);
    }

    notesList.appendChild(li);
  });
}

addNoteBtn.onclick = () => {
  const title = noteTitleInput.value.trim() || "Untitled Note";
  const content = noteInput.value.trim();
  if (!content) return;

  const users = loadUsers();
  const timestamp = new Date().toLocaleString();

  users[currentUser].notes.push({ title, content, timestamp });
  saveUsers(users);

  noteInput.value = "";
  noteTitleInput.value = "";
  renderNotes();
};

signupBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    authMessage.textContent = "Both fields are required.";
    return;
  }

  const users = loadUsers();
  if (users[username]) {
    authMessage.textContent = "User already exists.";
    return;
  }

  const hashed = await hashPassword(password);
  users[username] = { password: hashed, notes: [] };
  saveUsers(users);
  authMessage.textContent = "Sign-up successful! Please log in.";
};

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const users = loadUsers();

  if (!users[username]) {
    authMessage.textContent = "User not found.";
    return;
  }

  const hashed = await hashPassword(password);
  if (users[username].password === hashed) {
    currentUser = username;

    if (rememberMeCheckbox.checked) {
      localStorage.setItem("rememberedUser", currentUser);
    } else {
      localStorage.removeItem("rememberedUser");
    }

    showNotes();
  } else {
    authMessage.textContent = "Invalid credentials.";
  }
};

logoutBtn.onclick = () => {
  currentUser = null;
  localStorage.removeItem("rememberedUser");
  authSection.classList.remove("hidden");
  noteSection.classList.add("hidden");
  usernameInput.value = "";
  passwordInput.value = "";
  noteInput.value = "";
  noteTitleInput.value = "";
};

window.onload = () => {
  const remembered = localStorage.getItem("rememberedUser");
  if (remembered) {
    const users = loadUsers();
    if (users[remembered]) {
      currentUser = remembered;
      showNotes();
    }
  }
};


// Automatic Login
window.onload = () => {
  const remembered = localStorage.getItem("rememberedUser");
  if (remembered) {
    const users = loadUsers();
    if (users[remembered]) {
      currentUser = remembered;
      showNotes();
    }
  }
};

// Service Worker Registration for Offline Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
      }, function(error) {
        console.error('Service Worker registration failed:', error);
      });
  });
}
