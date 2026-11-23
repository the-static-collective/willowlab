const statusEl = document.getElementById("status");
const titleEl = document.getElementById("package-title");
const expiryEl = document.getElementById("expiration");
const filesEl = document.getElementById("files");
const token = new URLSearchParams(location.hash.slice(1)).get("share");

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", error);
}

async function api(action, data) {
  const response = await fetch("/api/fileport/" + action, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to complete request");
  return body;
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "File";
  if (n < 1024) return n + " B";
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return value.toFixed(value < 10 ? 1 : 0) + " " + units[i];
}

function drawFile(file) {
  const li = document.createElement("li");
  const details = document.createElement("div");
  const name = document.createElement("div");
  name.className = "file-name";
  name.textContent = file.name;
  const meta = document.createElement("div");
  meta.className = "file-details";
  meta.textContent = formatBytes(file.size);
  details.append(name, meta);
  const button = document.createElement("button");
  button.className = "download";
  button.type = "button";
  button.textContent = "Download";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Preparing…";
    try {
      const result = await api("download", { token, fileId: file.id });
      if (!result.url || !result.url.startsWith("https://")) throw new Error("No download URL");
      location.assign(result.url);
    } catch (error) {
      setStatus(error.message || "Download unavailable", true);
      button.disabled = false;
      button.textContent = "Try again";
    }
  });
  li.append(details, button);
  filesEl.append(li);
}

async function main() {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    setStatus("This page needs a valid private invitation link.", true);
    return;
  }
  try {
    const data = await api("share", { token });
    titleEl.textContent = data.label || "Shared package";
    expiryEl.textContent = "Invitation expires " + new Date(data.expiresAt).toLocaleString();
    expiryEl.hidden = false;
    filesEl.replaceChildren();
    for (const f of data.files || []) drawFile(f);
    setStatus(data.files?.length ? data.files.length + " file(s) available." : "No approved files in this package.");
  } catch (error) {
    setStatus(error.message || "Link not found or expired", true);
  }
}

main();
