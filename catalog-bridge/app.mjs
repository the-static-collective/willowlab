const button = document.querySelector("#read-catalog");
const status = document.querySelector("#catalog-status");
const list = document.querySelector("#catalog-results");
const source = document.querySelector("#catalog-source");
const present = (message) => {status.textContent = message;};
button.addEventListener("click", async () => {
  button.disabled = true;
  list.replaceChildren();
  source.textContent = "";
  present("Checking the read-only public development projection…");
  try {
    const response = await fetch("/api/willow-catalog", {method:"GET", credentials:"omit", cache:"no-store"});
    const data = await response.json();
    if (!response.ok || data.ok !== true || data.schema !== "willowlab.catalog-read/1" || !Array.isArray(data.records))
      throw Error(data.error === "DISABLED" ? "Connection disabled pending owner review." : "Source unavailable or not configured.");
    present(data.records.length + " public development services returned; catalog revision " + data.revision + ".");
    source.textContent = "Observed " + data.observed_at + " · WillowConnect is the source of truth · not a price quote.";
    for (const record of data.records) {
      const item = document.createElement("li"), title = document.createElement("strong"), detail = document.createElement("span");
      title.textContent = record.name;
      detail.textContent = record.category + " · " + record.unit;
      item.append(title, document.createTextNode(" — "), detail);
      list.append(item);
    }
  } catch(error) {
    present(error.message || "Could not read the public preview. No inquiry was sent.");
  } finally {button.disabled = false;}
});
