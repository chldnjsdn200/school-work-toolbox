const studentCountEl = document.getElementById("studentCount");
const colsEl = document.getElementById("cols");
const rowsEl = document.getElementById("rows");
const frontPriorityEl = document.getElementById("frontPriority");
const separatePairsEl = document.getElementById("separatePairs");

const generateBtn = document.getElementById("generateBtn");
const reshuffleBtn = document.getElementById("reshuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const printBtn = document.getElementById("printBtn");
const studentModeBtn = document.getElementById("studentModeBtn");
const exitStudentModeBtn = document.getElementById("exitStudentModeBtn");

const seatGrid = document.getElementById("seatGrid");
const messageEl = document.getElementById("message");

let lastConfig = null;

function getConfig() {
  return {
    studentCount: Number(studentCountEl.value),
    cols: Number(colsEl.value),
    rows: Number(rowsEl.value),
    frontPriority: parseNumberList(frontPriorityEl.value),
    separatePairs: parsePairs(separatePairsEl.value)
  };
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function renderSeats(seats, cols) {
  seatGrid.innerHTML = "";
  seatGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  seats.forEach((student) => {
    const seat = document.createElement("div");
    seat.className = student === null ? "seat empty" : "seat";
    seat.textContent = student === null ? "빈자리" : `${student}번`;
    seatGrid.appendChild(seat);
  });
}

function runGeneration() {
  const config = getConfig();
  const result = generateSeating(config);

  if (!result.ok) {
    showMessage(result.error, true);
    reshuffleBtn.disabled = true;
    printBtn.disabled = true;
    return;
  }

  lastConfig = config;
  renderSeats(result.seats, config.cols);
  showMessage(`조건을 만족하는 자리배치를 생성함 · ${result.attempts}회 시도`);
  reshuffleBtn.disabled = false;
  printBtn.disabled = false;
}

generateBtn.addEventListener("click", runGeneration);

reshuffleBtn.addEventListener("click", () => {
  if (!lastConfig) return;

  const result = generateSeating(lastConfig);

  if (!result.ok) {
    showMessage(result.error, true);
    return;
  }

  renderSeats(result.seats, lastConfig.cols);
  showMessage("새로운 자리배치를 생성함");
});

resetBtn.addEventListener("click", () => {
  studentCountEl.value = 27;
  colsEl.value = 6;
  rowsEl.value = 5;
  frontPriorityEl.value = "";
  separatePairsEl.value = "";
  seatGrid.innerHTML = "";
  lastConfig = null;
  reshuffleBtn.disabled = true;
  printBtn.disabled = true;
  showMessage("");
});

printBtn.addEventListener("click", () => {
  window.print();
});

studentModeBtn.addEventListener("click", () => {
  if (!lastConfig) {
    runGeneration();
    if (!lastConfig) return;
  }

  document.body.classList.add("student-mode");
  exitStudentModeBtn.classList.remove("hidden");
});

exitStudentModeBtn.addEventListener("click", () => {
  document.body.classList.remove("student-mode");
  exitStudentModeBtn.classList.add("hidden");
});

// 엔터키로 바로 생성
[studentCountEl, colsEl, rowsEl, frontPriorityEl].forEach(el => {
  el.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      runGeneration();
    }
  });
});
