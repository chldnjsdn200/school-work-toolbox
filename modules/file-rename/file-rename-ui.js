const fileInput = document.getElementById("fileInput");
const clearFilesBtn = document.getElementById("clearFilesBtn");
const resetOptionsBtn = document.getElementById("resetOptionsBtn");
const createFilesBtn = document.getElementById("createFilesBtn");
const fileSummary = document.getElementById("fileSummary");
const fileListBody = document.getElementById("fileListBody");
const previewBody = document.getElementById("previewBody");
const validationMessage = document.getElementById("validationMessage");

const optionEls = {
  prefix: document.getElementById("prefixInput"),
  suffix: document.getElementById("suffixInput"),
  findText: document.getElementById("findInput"),
  replaceText: document.getElementById("replaceInput"),
  removeText: document.getElementById("removeInput"),
  numberingEnabled: document.getElementById("numberingEnabled"),
  numberingBase: document.getElementById("numberingBaseInput"),
  startNumber: document.getElementById("startNumberInput"),
  numberDigits: document.getElementById("numberDigitsInput")
};

let selectedFiles = [];
let currentPlan = {
  ok: false,
  errors: [],
  rows: []
};

function getOptionsFromForm() {
  return normalizeRenameOptions({
    prefix: optionEls.prefix.value,
    suffix: optionEls.suffix.value,
    findText: optionEls.findText.value,
    replaceText: optionEls.replaceText.value,
    removeText: optionEls.removeText.value,
    numberingEnabled: optionEls.numberingEnabled.checked,
    numberingBase: optionEls.numberingBase.value,
    startNumber: optionEls.startNumber.value,
    numberDigits: optionEls.numberDigits.value
  });
}

function setOptionsToForm(options) {
  optionEls.prefix.value = options.prefix;
  optionEls.suffix.value = options.suffix;
  optionEls.findText.value = options.findText;
  optionEls.replaceText.value = options.replaceText;
  optionEls.removeText.value = options.removeText;
  optionEls.numberingEnabled.checked = options.numberingEnabled;
  optionEls.numberingBase.value = options.numberingBase;
  optionEls.startNumber.value = options.startNumber;
  optionEls.numberDigits.value = options.numberDigits;
}

function renderFileList() {
  fileListBody.innerHTML = "";
  fileSummary.textContent = selectedFiles.length
    ? `${selectedFiles.length}개 파일 선택됨`
    : "선택된 파일이 없습니다.";

  selectedFiles.forEach(file => {
    const { baseName, extension } = splitFileName(file.name);
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const extensionCell = document.createElement("td");

    nameCell.textContent = baseName;
    extensionCell.textContent = extension || "(없음)";

    row.append(nameCell, extensionCell);
    fileListBody.appendChild(row);
  });
}

function renderPreview() {
  currentPlan = planRename(selectedFiles, getOptionsFromForm());
  previewBody.innerHTML = "";

  currentPlan.rows.forEach(row => {
    const tr = document.createElement("tr");
    const originalCell = document.createElement("td");
    const newCell = document.createElement("td");
    const statusCell = document.createElement("td");

    originalCell.textContent = row.originalName;
    newCell.textContent = row.newName;

    if (row.errors.length) {
      tr.classList.add("error-row");
      statusCell.textContent = row.errors.join(" ");
    } else {
      statusCell.textContent = "가능";
    }

    tr.append(originalCell, newCell, statusCell);
    previewBody.appendChild(tr);
  });

  if (!selectedFiles.length) {
    validationMessage.textContent = "먼저 파일을 선택해 주세요.";
    validationMessage.classList.remove("ok");
    validationMessage.classList.add("error");
    createFilesBtn.disabled = true;
    return;
  }

  if (!currentPlan.ok) {
    validationMessage.textContent = currentPlan.errors.join(" ");
    validationMessage.classList.remove("ok");
    validationMessage.classList.add("error");
    createFilesBtn.disabled = true;
    return;
  }

  validationMessage.textContent = "변경된 파일을 만들 수 있습니다.";
  validationMessage.classList.remove("error");
  validationMessage.classList.add("ok");
  createFilesBtn.disabled = false;
}

function updateAll() {
  renderFileList();
  renderPreview();
}

function downloadRenamedFile(file, newName) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = newName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

fileInput.addEventListener("change", () => {
  selectedFiles = Array.from(fileInput.files);
  updateAll();
});

Object.values(optionEls).forEach(el => {
  el.addEventListener("input", renderPreview);
  el.addEventListener("change", renderPreview);
});

clearFilesBtn.addEventListener("click", () => {
  selectedFiles = [];
  fileInput.value = "";
  updateAll();
});

resetOptionsBtn.addEventListener("click", () => {
  setOptionsToForm(getDefaultRenameOptions());
  renderPreview();
});

createFilesBtn.addEventListener("click", () => {
  if (!currentPlan.ok || !currentPlan.rows.length) return;

  currentPlan.rows.forEach((row, index) => {
    window.setTimeout(() => downloadRenamedFile(row.file, row.newName), index * 180);
  });
});

setOptionsToForm(getDefaultRenameOptions());
updateAll();
