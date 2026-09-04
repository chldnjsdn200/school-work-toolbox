const shuffleBtn = document.getElementById("shuffleBtn");
const reshuffleBtn = document.getElementById("reshuffleBtn");
const seatGrid = document.getElementById("seatGrid");
const messageEl = document.getElementById("message");

let currentConfig = loadSeatingConfig();
let hasResult = false;
let isAnimating = false;

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function setButtonsDisabled(disabled) {
  shuffleBtn.disabled = disabled;
  reshuffleBtn.disabled = disabled || !hasResult;
}

function renderSeats(seats, cols, options = {}) {
  seatGrid.innerHTML = "";
  seatGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  seats.forEach((student) => {
    const seat = document.createElement("div");
    seat.className = student === null ? "seat empty" : "seat";

    if (options.placeholder) {
      seat.textContent = "";
    } else {
      seat.textContent = student === null ? "빈자리" : `${student}번`;
    }

    if (options.animating) {
      seat.classList.add("spinning");
    }

    seatGrid.appendChild(seat);
  });
}

function renderBlankSeats() {
  const totalSeats = currentConfig.rows * currentConfig.cols;
  renderSeats(Array(totalSeats).fill(null), currentConfig.cols, { placeholder: true });
}

function createAnimationSeats(config) {
  const students = Array.from({ length: config.studentCount }, (_, i) => i + 1);
  const blanks = Array(config.rows * config.cols - config.studentCount).fill(null);
  return shuffle([...students, ...blanks]);
}

function finishShuffle(result) {
  if (!result.ok) {
    showMessage("자리배치를 만들 수 없습니다.", true);
    hasResult = false;
    setButtonsDisabled(false);
    return;
  }

  renderSeats(result.seats, currentConfig.cols);
  showMessage("자리배치 완료");
  hasResult = true;
  setButtonsDisabled(false);
}

function runShuffle() {
  if (isAnimating) return;

  currentConfig = loadSeatingConfig();
  const result = generateSeating(currentConfig);

  isAnimating = true;
  showMessage("");
  setButtonsDisabled(true);

  const startedAt = Date.now();
  const duration = 1400 + Math.floor(Math.random() * 500);

  renderSeats(createAnimationSeats(currentConfig), currentConfig.cols, { animating: true });

  const timer = window.setInterval(() => {
    renderSeats(createAnimationSeats(currentConfig), currentConfig.cols, { animating: true });

    if (Date.now() - startedAt >= duration) {
      window.clearInterval(timer);
      isAnimating = false;
      finishShuffle(result);
    }
  }, 90);
}

shuffleBtn.addEventListener("click", runShuffle);
reshuffleBtn.addEventListener("click", runShuffle);

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    window.location.href = "teacher.html";
  }
});

renderBlankSeats();
