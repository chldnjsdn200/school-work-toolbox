const studentCountEl = document.getElementById("studentCount");
const colsEl = document.getElementById("cols");
const rowsEl = document.getElementById("rows");
const frontPriorityEl = document.getElementById("frontPriority");
const separatePairsEl = document.getElementById("separatePairs");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const summaryList = document.getElementById("summaryList");
const messageEl = document.getElementById("message");

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function formatNumbers(numbers) {
  return numbers.length ? numbers.map(n => `${n}번`).join(", ") : "없음";
}

function formatPairs(pairs) {
  return pairs.length ? pairs.map(([a, b]) => `${a}번-${b}번`).join(", ") : "없음";
}

function readFormConfig() {
  return {
    studentCount: Number(studentCountEl.value),
    cols: Number(colsEl.value),
    rows: Number(rowsEl.value),
    frontPriority: parseNumberList(frontPriorityEl.value),
    separatePairs: parsePairs(separatePairsEl.value)
  };
}

function writeFormConfig(config) {
  studentCountEl.value = config.studentCount;
  colsEl.value = config.cols;
  rowsEl.value = config.rows;
  frontPriorityEl.value = config.frontPriority.join(", ");
  separatePairsEl.value = config.separatePairs.map(([a, b]) => `${a}-${b}`).join("\n");
}

function renderSummary(config) {
  const items = [
    ["학생 수", `${config.studentCount}명`],
    ["좌석", `가로 ${config.cols} x 세로 ${config.rows}`],
    ["앞자리 우선 학생", formatNumbers(config.frontPriority)],
    ["서로 떨어뜨릴 학생 쌍", formatPairs(config.separatePairs)]
  ];

  summaryList.innerHTML = "";

  items.forEach(([term, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");

    dt.textContent = term;
    dd.textContent = value;

    summaryList.append(dt, dd);
  });
}

function refreshFromSaved() {
  const config = loadSeatingConfig();
  writeFormConfig(config);
  renderSummary(config);
}

saveBtn.addEventListener("click", () => {
  const result = saveSeatingConfig(readFormConfig());

  if (!result.ok) {
    showMessage(result.error, true);
    return;
  }

  writeFormConfig(result.config);
  renderSummary(result.config);
  showMessage("설정을 저장했습니다.");
});

resetBtn.addEventListener("click", () => {
  const config = resetSeatingConfig();
  writeFormConfig(config);
  renderSummary(config);
  showMessage("설정을 기본값으로 초기화했습니다.");
});

[studentCountEl, colsEl, rowsEl, frontPriorityEl].forEach((el) => {
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveBtn.click();
    }
  });
});

refreshFromSaved();
