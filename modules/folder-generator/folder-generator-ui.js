const modeButtons = Array.from(document.querySelectorAll(".mode-tab"));
const templateSelect = document.getElementById("templateSelect");
const simplePanel = document.getElementById("simplePanel");
const numberPanel = document.getElementById("numberPanel");
const treePanel = document.getElementById("treePanel");
const simpleInput = document.getElementById("simpleInput");
const treeInput = document.getElementById("treeInput");
const numberPrefix = document.getElementById("numberPrefix");
const numberBase = document.getElementById("numberBase");
const numberSuffix = document.getElementById("numberSuffix");
const startNumber = document.getElementById("startNumber");
const endNumber = document.getElementById("endNumber");
const numberDigits = document.getElementById("numberDigits");
const resetBtn = document.getElementById("resetBtn");
const validationMessage = document.getElementById("validationMessage");
const previewSummary = document.getElementById("previewSummary");
const previewTree = document.getElementById("previewTree");
const pickDirectoryBtn = document.getElementById("pickDirectoryBtn");
const createFoldersBtn = document.getElementById("createFoldersBtn");
const directoryMessage = document.getElementById("directoryMessage");
const resultBox = document.getElementById("resultBox");

let currentMode = "simple";
let currentPlan = createFolderPlan(getDefaultFolderState());
let selectedDirectoryHandle = null;

function getNumberPosition() {
  const checked = document.querySelector('input[name="numberPosition"]:checked');
  return checked ? checked.value : "before";
}

function setNumberPosition(value) {
  const radio = document.querySelector(`input[name="numberPosition"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function getStateFromForm() {
  return {
    mode: currentMode,
    simpleText: simpleInput.value,
    numberPrefix: numberPrefix.value,
    numberBase: numberBase.value,
    numberSuffix: numberSuffix.value,
    startNumber: Number(startNumber.value),
    endNumber: Number(endNumber.value),
    numberDigits: Number(numberDigits.value),
    numberPosition: getNumberPosition(),
    treeText: treeInput.value
  };
}

function setFormState(state) {
  currentMode = state.mode;
  simpleInput.value = state.simpleText ?? "";
  numberPrefix.value = state.numberPrefix ?? "";
  numberBase.value = state.numberBase ?? "";
  numberSuffix.value = state.numberSuffix ?? "";
  startNumber.value = state.startNumber ?? 1;
  endNumber.value = state.endNumber ?? 12;
  numberDigits.value = state.numberDigits ?? 1;
  setNumberPosition(state.numberPosition ?? "before");
  treeInput.value = state.treeText ?? "";
  setMode(currentMode, false);
}

function setMode(mode, updatePreview = true) {
  currentMode = mode;

  modeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  simplePanel.classList.toggle("hidden", mode !== "simple");
  numberPanel.classList.toggle("hidden", mode !== "number");
  treePanel.classList.toggle("hidden", mode !== "tree");

  if (updatePreview) {
    refreshPreview();
  }
}

function renderTreeNodes(nodes) {
  const ul = document.createElement("ul");

  nodes.forEach(node => {
    const li = document.createElement("li");
    const label = document.createElement("span");

    label.textContent = node.name;
    li.appendChild(label);

    if (node.children.length) {
      li.appendChild(renderTreeNodes(node.children));
    }

    ul.appendChild(li);
  });

  return ul;
}

function refreshPreview() {
  currentPlan = createFolderPlan(getStateFromForm());
  previewTree.innerHTML = "";

  if (currentPlan.tree.length) {
    previewTree.appendChild(renderTreeNodes(currentPlan.tree));
  }

  previewSummary.textContent = currentPlan.allPaths.length
    ? `생성 예정 폴더 ${currentPlan.allPaths.length}개`
    : "생성 예정 폴더가 없습니다.";

  if (!currentPlan.ok) {
    validationMessage.textContent = currentPlan.errors.join(" ");
    validationMessage.classList.remove("ok");
    validationMessage.classList.add("error");
  } else {
    validationMessage.textContent = "폴더를 만들 수 있습니다.";
    validationMessage.classList.remove("error");
    validationMessage.classList.add("ok");
  }

  createFoldersBtn.disabled = !currentPlan.ok || !selectedDirectoryHandle;
}

function resetResult() {
  resultBox.classList.add("hidden");
  resultBox.innerHTML = "";
}

function renderResult(stats) {
  resultBox.classList.remove("hidden");
  resultBox.innerHTML = "";

  const summary = document.createElement("p");
  summary.className = "result-summary";
  summary.textContent = `생성 완료: ${stats.created.length}개 / 이미 존재하여 건너뜀: ${stats.skipped.length}개 / 실패: ${stats.failed.length}개`;

  resultBox.appendChild(summary);

  if (stats.skipped.length || stats.failed.length) {
    const list = document.createElement("ul");

    stats.skipped.forEach(path => {
      const item = document.createElement("li");
      item.textContent = `${path}: 이미 존재하여 건너뜀`;
      list.appendChild(item);
    });

    stats.failed.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.path}: ${item.message}`;
      list.appendChild(li);
    });

    resultBox.appendChild(list);
  }
}

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    templateSelect.value = "";
    setMode(button.dataset.mode);
    resetResult();
  });
});

templateSelect.addEventListener("change", () => {
  if (!templateSelect.value) return;
  setFormState(getTemplateState(templateSelect.value));
  refreshPreview();
  resetResult();
});

[
  simpleInput,
  treeInput,
  numberPrefix,
  numberBase,
  numberSuffix,
  startNumber,
  endNumber,
  numberDigits,
  ...Array.from(document.querySelectorAll('input[name="numberPosition"]'))
].forEach(element => {
  element.addEventListener("input", () => {
    templateSelect.value = "";
    refreshPreview();
    resetResult();
  });
  element.addEventListener("change", () => {
    templateSelect.value = "";
    refreshPreview();
    resetResult();
  });
});

resetBtn.addEventListener("click", () => {
  templateSelect.value = "";
  selectedDirectoryHandle = null;
  directoryMessage.textContent = "아직 생성 위치를 선택하지 않았습니다.";
  setFormState(getDefaultFolderState());
  refreshPreview();
  resetResult();
});

pickDirectoryBtn.addEventListener("click", async () => {
  resetResult();

  if (!("showDirectoryPicker" in window)) {
    directoryMessage.textContent = "현재 브라우저에서는 직접 폴더 생성 기능을 지원하지 않습니다. Chrome 또는 Edge 최신 버전을 이용해주세요.";
    selectedDirectoryHandle = null;
    refreshPreview();
    return;
  }

  try {
    selectedDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    directoryMessage.textContent = "생성 위치를 선택했습니다.";
  } catch (error) {
    selectedDirectoryHandle = null;
    directoryMessage.textContent = error && error.name === "AbortError"
      ? "폴더 선택을 취소했습니다."
      : "생성 위치를 선택하지 못했습니다.";
  }

  refreshPreview();
});

createFoldersBtn.addEventListener("click", async () => {
  if (!selectedDirectoryHandle || !currentPlan.ok) return;

  createFoldersBtn.disabled = true;
  directoryMessage.textContent = "폴더를 만드는 중입니다.";
  resetResult();

  const stats = await createFoldersAt(selectedDirectoryHandle, currentPlan.allPaths);

  renderResult(stats);
  directoryMessage.textContent = "폴더 만들기가 끝났습니다.";
  refreshPreview();
});

setFormState(getDefaultFolderState());
refreshPreview();
