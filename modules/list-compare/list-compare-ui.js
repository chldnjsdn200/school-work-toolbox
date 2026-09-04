const quickModeEl = document.getElementById("quickMode");
const listAEl = document.getElementById("listA");
const listBEl = document.getElementById("listB");
const labelAEl = document.getElementById("labelA");
const labelBEl = document.getElementById("labelB");
const fileAEl = document.getElementById("fileA");
const fileBEl = document.getElementById("fileB");
const sortModeEl = document.getElementById("sortMode");
const trimWhitespaceEl = document.getElementById("trimWhitespace");
const removeEmptyEl = document.getElementById("removeEmpty");
const ignoreCaseEl = document.getElementById("ignoreCase");
const ignoreAllWhitespaceEl = document.getElementById("ignoreAllWhitespace");
const numericCompareEl = document.getElementById("numericCompare");
const uniqueForCompareEl = document.getElementById("uniqueForCompare");
const compareBtn = document.getElementById("compareBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const messageEl = document.getElementById("message");
const resultSection = document.getElementById("resultSection");
const summaryGrid = document.getElementById("summaryGrid");
const resultGrid = document.getElementById("resultGrid");

let lastResult = null;

const modeLabels = {
  general: {
    a: "A 목록 - 기준 목록",
    b: "B 목록 - 비교 목록",
    onlyA: "A에만 있음",
    onlyB: "B에만 있음"
  },
  "missing-submit": {
    a: "A 목록 - 전체 대상 목록",
    b: "B 목록 - 제출 완료 목록",
    onlyA: "미제출",
    onlyB: "제출 목록에만 있음"
  },
  "missing-value": {
    a: "A 목록 - 기준 목록",
    b: "B 목록 - 확인된 목록",
    onlyA: "누락값",
    onlyB: "추가로 있는 값"
  }
};

function showMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function getSaveFormat() {
  const checked = document.querySelector('input[name="saveFormat"]:checked');
  return checked ? checked.value : "xlsx";
}

function getOptionsFromForm() {
  return normalizeCompareOptions({
    trimWhitespace: trimWhitespaceEl.checked,
    removeEmpty: removeEmptyEl.checked,
    ignoreCase: ignoreCaseEl.checked,
    ignoreAllWhitespace: ignoreAllWhitespaceEl.checked,
    numericCompare: numericCompareEl.checked,
    uniqueForCompare: uniqueForCompareEl.checked,
    sortMode: sortModeEl.value
  });
}

function setDefaultOptions() {
  const options = getDefaultCompareOptions();
  sortModeEl.value = options.sortMode;
  trimWhitespaceEl.checked = options.trimWhitespace;
  removeEmptyEl.checked = options.removeEmpty;
  ignoreCaseEl.checked = options.ignoreCase;
  ignoreAllWhitespaceEl.checked = options.ignoreAllWhitespace;
  numericCompareEl.checked = options.numericCompare;
  uniqueForCompareEl.checked = options.uniqueForCompare;
  document.querySelector('input[name="saveFormat"][value="xlsx"]').checked = true;
}

function applyQuickModeLabels() {
  const labels = modeLabels[quickModeEl.value] || modeLabels.general;
  labelAEl.textContent = labels.a;
  labelBEl.textContent = labels.b;
}

function renderSummary(result) {
  const labels = modeLabels[quickModeEl.value] || modeLabels.general;
  const items = [
    ["A 목록", result.summary.totalA],
    ["B 목록", result.summary.totalB],
    ["공통", result.summary.common],
    [labels.onlyA, result.summary.onlyA],
    [labels.onlyB, result.summary.onlyB],
    ["A 중복", result.summary.duplicatesA],
    ["B 중복", result.summary.duplicatesB]
  ];

  summaryGrid.innerHTML = "";

  items.forEach(([label, count]) => {
    const card = document.createElement("div");
    const name = document.createElement("span");
    const value = document.createElement("strong");

    name.textContent = label;
    value.textContent = `${count}개`;
    card.append(name, value);
    summaryGrid.appendChild(card);
  });
}

function entriesToText(entries, duplicateMode = false) {
  if (!entries.length) return "";

  return entries
    .map(entry => duplicateMode ? `${entry.value} × ${entry.count}` : entry.value)
    .join("\n");
}

function renderResultCard(key, title, entries, duplicateMode = false) {
  const card = document.createElement("article");
  const header = document.createElement("div");
  const heading = document.createElement("h3");
  const copyBtn = document.createElement("button");
  const body = document.createElement("pre");

  card.className = "result-card";
  header.className = "result-card-head";
  copyBtn.className = "small-button";
  copyBtn.type = "button";
  copyBtn.textContent = "복사";
  copyBtn.dataset.resultKey = key;
  copyBtn.dataset.duplicateMode = duplicateMode ? "true" : "false";

  heading.textContent = `${title} ${entries.length}개`;
  body.textContent = entries.length ? entriesToText(entries, duplicateMode) : (duplicateMode ? "중복 없음" : "없음");

  header.append(heading, copyBtn);
  card.append(header, body);
  resultGrid.appendChild(card);
}

function renderResults(result) {
  const labels = modeLabels[quickModeEl.value] || modeLabels.general;

  resultSection.classList.remove("hidden");
  resultGrid.innerHTML = "";

  renderSummary(result);
  renderResultCard("common", "공통값", result.results.common);
  renderResultCard("onlyA", labels.onlyA, result.results.onlyA);
  renderResultCard("onlyB", labels.onlyB, result.results.onlyB);
  renderResultCard("duplicatesA", "A 내부 중복값", result.results.duplicatesA, true);
  renderResultCard("duplicatesB", "B 내부 중복값", result.results.duplicatesB, true);
}

function runCompare() {
  const result = compareLists(listAEl.value, listBEl.value, getOptionsFromForm());

  if (!result.ok) {
    lastResult = null;
    saveBtn.disabled = true;
    resultSection.classList.add("hidden");
    showMessage(result.error, "error");
    return;
  }

  lastResult = result;
  saveBtn.disabled = false;
  renderResults(result);
  showMessage(result.warning || "목록 비교가 완료되었습니다.", result.warning ? "warn" : "ok");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveCsv(result) {
  const blob = new Blob([buildCsv(result)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, makeDatedFileName("csv"));
}

function saveXlsx(result) {
  const blob = buildXlsxBlob(result);
  downloadBlob(blob, makeDatedFileName("xlsx"));
}

function saveResult() {
  if (!lastResult) {
    showMessage("먼저 목록을 비교해 주세요.", "error");
    return;
  }

  try {
    if (getSaveFormat() === "csv") {
      saveCsv(lastResult);
      showMessage("CSV 결과 파일을 만들었습니다.", "ok");
      return;
    }

    saveXlsx(lastResult);
    showMessage("Excel 결과 파일을 만들었습니다.", "ok");
  } catch (error) {
    showMessage(error && error.message ? error.message : "결과 저장에 실패했습니다.", "error");
  }
}

async function copyResult(key, duplicateMode) {
  if (!lastResult) return;

  const entries = lastResult.results[key] || [];
  const text = entriesToText(entries, duplicateMode);

  try {
    await navigator.clipboard.writeText(text);
    showMessage("복사됨", "ok");
  } catch (_error) {
    showMessage("클립보드 복사를 사용할 수 없습니다.", "error");
  }
}

function loadTextFile(file, targetEl, fileInputEl) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    targetEl.value = String(reader.result || "");
    fileInputEl.value = "";
    showMessage("파일을 불러왔습니다.", "ok");
  };

  reader.onerror = () => {
    fileInputEl.value = "";
    showMessage("파일을 읽지 못했습니다.", "error");
  };

  reader.readAsText(file, "utf-8");
}

function hasInputOrResult() {
  return Boolean(listAEl.value || listBEl.value || lastResult);
}

function resetAll() {
  if (hasInputOrResult() && !window.confirm("입력한 목록과 결과를 모두 초기화할까요?")) {
    return;
  }

  quickModeEl.value = "general";
  listAEl.value = "";
  listBEl.value = "";
  fileAEl.value = "";
  fileBEl.value = "";
  setDefaultOptions();
  applyQuickModeLabels();
  lastResult = null;
  saveBtn.disabled = true;
  resultSection.classList.add("hidden");
  summaryGrid.innerHTML = "";
  resultGrid.innerHTML = "";
  showMessage("");
}

quickModeEl.addEventListener("change", applyQuickModeLabels);
compareBtn.addEventListener("click", runCompare);
saveBtn.addEventListener("click", saveResult);
resetBtn.addEventListener("click", resetAll);

fileAEl.addEventListener("change", () => {
  loadTextFile(fileAEl.files[0], listAEl, fileAEl);
});

fileBEl.addEventListener("change", () => {
  loadTextFile(fileBEl.files[0], listBEl, fileBEl);
});

resultGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-result-key]");
  if (!button) return;

  copyResult(button.dataset.resultKey, button.dataset.duplicateMode === "true");
});

[
  sortModeEl,
  trimWhitespaceEl,
  removeEmptyEl,
  ignoreCaseEl,
  ignoreAllWhitespaceEl,
  numericCompareEl,
  uniqueForCompareEl
].forEach(element => {
  element.addEventListener("change", () => {
    if (lastResult) runCompare();
  });
});

applyQuickModeLabels();
setDefaultOptions();
