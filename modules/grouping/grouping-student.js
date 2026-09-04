const makeGroupsBtn = document.getElementById("makeGroupsBtn");
const reshuffleBtn = document.getElementById("reshuffleBtn");
const printBtn = document.getElementById("printBtn");
const copyBtn = document.getElementById("copyBtn");
const waitingDeck = document.getElementById("waitingDeck");
const groupGrid = document.getElementById("groupGrid");
const messageEl = document.getElementById("message");

let currentConfig = loadGroupingConfig();
let lastGroups = null;
let isAnimating = false;

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function setActionState(disabled) {
  makeGroupsBtn.disabled = disabled;
  reshuffleBtn.disabled = disabled || !lastGroups;
  printBtn.disabled = disabled || !lastGroups;
  copyBtn.disabled = disabled || !lastGroups;
}

function renderWaitingDeck(config) {
  waitingDeck.innerHTML = "";
  waitingDeck.classList.remove("hidden");
  groupGrid.classList.add("hidden");

  Array.from({ length: config.studentCount }, (_, index) => index + 1).forEach(student => {
    const chip = document.createElement("span");
    chip.className = "student-chip";
    chip.textContent = `${student}번`;
    waitingDeck.appendChild(chip);
  });
}

function renderGroups(groups, options = {}) {
  waitingDeck.classList.add("hidden");
  groupGrid.classList.remove("hidden");
  groupGrid.innerHTML = "";

  groups.forEach((group, index) => {
    const card = document.createElement("article");
    card.className = "group-card";

    if (options.animating) {
      card.classList.add("shuffling");
    }

    const title = document.createElement("h2");
    title.textContent = `${index + 1}모둠`;

    const list = document.createElement("ul");

    group.forEach(student => {
      const item = document.createElement("li");
      item.textContent = `${student}번`;
      list.appendChild(item);
    });

    card.append(title, list);
    groupGrid.appendChild(card);
  });
}

function createAnimationGroups(config) {
  const capacities = getGroupCapacities(config.studentCount, config.groupCount);
  const students = shuffle(Array.from({ length: config.studentCount }, (_, index) => index + 1));
  let cursor = 0;

  return capacities.map(size => {
    const group = students.slice(cursor, cursor + size);
    cursor += size;
    return group;
  });
}

function finishGrouping(result) {
  if (!result.ok) {
    showMessage("모둠을 만들 수 없습니다.", true);
    lastGroups = null;
    setActionState(false);
    return;
  }

  lastGroups = result.groups;
  renderGroups(result.groups);
  showMessage("모둠 편성이 완료되었습니다");
  setActionState(false);
}

function runGrouping() {
  if (isAnimating) return;

  currentConfig = loadGroupingConfig();
  const result = generateGrouping(currentConfig);

  isAnimating = true;
  showMessage("");
  setActionState(true);
  renderGroups(createAnimationGroups(currentConfig), { animating: true });

  const startedAt = Date.now();
  const duration = 1400 + Math.floor(Math.random() * 500);

  const timer = window.setInterval(() => {
    renderGroups(createAnimationGroups(currentConfig), { animating: true });

    if (Date.now() - startedAt >= duration) {
      window.clearInterval(timer);
      isAnimating = false;
      finishGrouping(result);
    }
  }, 120);
}

function groupsToText(groups) {
  return groups
    .map((group, index) => `${index + 1}모둠\n${group.map(student => `${student}번`).join("\n")}`)
    .join("\n\n");
}

makeGroupsBtn.addEventListener("click", runGrouping);
reshuffleBtn.addEventListener("click", runGrouping);

printBtn.addEventListener("click", () => {
  window.print();
});

copyBtn.addEventListener("click", async () => {
  if (!lastGroups) return;

  try {
    await navigator.clipboard.writeText(groupsToText(lastGroups));
    showMessage("결과를 복사했습니다");
  } catch (_error) {
    showMessage("복사를 사용할 수 없습니다.", true);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "g") {
    event.preventDefault();
    window.location.href = "teacher.html";
  }
});

renderWaitingDeck(currentConfig);
