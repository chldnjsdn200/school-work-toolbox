const studentCountEl = document.getElementById("studentCount");
const groupCountEl = document.getElementById("groupCount");
const groupSizeEl = document.getElementById("groupSize");
const separatePairsEl = document.getElementById("separatePairs");
const togetherPairsEl = document.getElementById("togetherPairs");
const fixedAssignmentsEl = document.getElementById("fixedAssignments");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const summaryList = document.getElementById("summaryList");
const messageEl = document.getElementById("message");

let lastChangedSizing = "groupCount";

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function formatPairs(pairs) {
  return pairs.length ? pairs.map(([a, b]) => `${a}번-${b}번`).join(", ") : "없음";
}

function formatFixedAssignments(items) {
  return items.length ? items.map(item => `${item.student}번: ${item.group}모둠`).join(", ") : "없음";
}

function readFormConfig() {
  const separateResult = parseGroupingPairs(separatePairsEl.value);
  if (!separateResult.ok) return { ok: false, error: `같은 모둠 금지: ${separateResult.error}` };

  const togetherResult = parseGroupingPairs(togetherPairsEl.value);
  if (!togetherResult.ok) return { ok: false, error: `같은 모둠 우선: ${togetherResult.error}` };

  const fixedResult = parseFixedAssignments(fixedAssignmentsEl.value);
  if (!fixedResult.ok) return { ok: false, error: `특정 모둠 고정: ${fixedResult.error}` };

  return {
    ok: true,
    config: {
      studentCount: Number(studentCountEl.value),
      groupCount: Number(groupCountEl.value),
      separatePairs: separateResult.pairs,
      togetherPairs: togetherResult.pairs,
      fixedAssignments: fixedResult.fixedAssignments
    }
  };
}

function writeFormConfig(config) {
  studentCountEl.value = config.studentCount;
  groupCountEl.value = config.groupCount;
  groupSizeEl.value = Math.ceil(config.studentCount / config.groupCount);
  separatePairsEl.value = config.separatePairs.map(([a, b]) => `${a}-${b}`).join("\n");
  togetherPairsEl.value = config.togetherPairs.map(([a, b]) => `${a}-${b}`).join("\n");
  fixedAssignmentsEl.value = config.fixedAssignments.map(item => `${item.student}:${item.group}`).join("\n");
}

function syncSizing(changedField) {
  const studentCount = Number(studentCountEl.value);
  const groupCount = Number(groupCountEl.value);
  const groupSize = Number(groupSizeEl.value);

  if (!Number.isInteger(studentCount) || studentCount < 1) return;

  if (changedField === "groupSize") {
    if (Number.isInteger(groupSize) && groupSize > 0) {
      groupCountEl.value = Math.max(1, Math.ceil(studentCount / groupSize));
    }
    return;
  }

  if (Number.isInteger(groupCount) && groupCount > 0) {
    groupSizeEl.value = Math.ceil(studentCount / groupCount);
  }
}

function renderSummary(config) {
  const capacities = getGroupCapacities(config.studentCount, config.groupCount);
  const items = [
    ["학생 수", `${config.studentCount}명`],
    ["모둠 수", `${config.groupCount}개`],
    ["모둠별 인원", capacities.map((size, index) => `${index + 1}모둠 ${size}명`).join(", ")],
    ["같은 모둠 금지", formatPairs(config.separatePairs)],
    ["같은 모둠 우선", formatPairs(config.togetherPairs)],
    ["특정 모둠 고정", formatFixedAssignments(config.fixedAssignments)]
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
  const config = loadGroupingConfig();
  writeFormConfig(config);
  renderSummary(config);
}

studentCountEl.addEventListener("input", () => syncSizing(lastChangedSizing));
groupCountEl.addEventListener("input", () => {
  lastChangedSizing = "groupCount";
  syncSizing("groupCount");
});
groupSizeEl.addEventListener("input", () => {
  lastChangedSizing = "groupSize";
  syncSizing("groupSize");
});

saveBtn.addEventListener("click", () => {
  const formResult = readFormConfig();

  if (!formResult.ok) {
    showMessage(formResult.error, true);
    return;
  }

  const validationError = validateGroupingConfig(formResult.config);
  if (validationError) {
    showMessage(validationError, true);
    return;
  }

  const result = saveGroupingConfig(formResult.config);

  if (!result.ok) {
    showMessage(result.error, true);
    return;
  }

  writeFormConfig(result.config);
  renderSummary(result.config);
  showMessage("설정을 저장했습니다.");
});

resetBtn.addEventListener("click", () => {
  const config = resetGroupingConfig();
  writeFormConfig(config);
  renderSummary(config);
  showMessage("설정을 기본값으로 초기화했습니다.");
});

[studentCountEl, groupCountEl, groupSizeEl].forEach((el) => {
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveBtn.click();
    }
  });
});

refreshFromSaved();
