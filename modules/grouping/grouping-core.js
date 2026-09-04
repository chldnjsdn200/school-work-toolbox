const GROUPING_STORAGE_KEY = "schoolWorkToolbox.grouping.config.v1";

const DEFAULT_GROUPING_CONFIG = {
  studentCount: 27,
  groupCount: 6,
  separatePairs: [],
  togetherPairs: [],
  fixedAssignments: []
};

function getDefaultGroupingConfig() {
  return {
    studentCount: DEFAULT_GROUPING_CONFIG.studentCount,
    groupCount: DEFAULT_GROUPING_CONFIG.groupCount,
    separatePairs: [],
    togetherPairs: [],
    fixedAssignments: []
  };
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseGroupingPairs(text = "") {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const pairs = [];

  for (let index = 0; index < lines.length; index++) {
    const parts = lines[index].split(/[-~,]/).map(value => value.trim());
    const numbers = parts.map(Number);

    if (parts.length !== 2 || !numbers.every(Number.isInteger)) {
      return {
        ok: false,
        error: `${index + 1}번째 줄은 "5-12" 형식으로 입력해 주세요.`
      };
    }

    pairs.push(numbers);
  }

  return { ok: true, pairs };
}

function parseFixedAssignments(text = "") {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const fixedAssignments = [];

  for (let index = 0; index < lines.length; index++) {
    const parts = lines[index].split(/[:：]/).map(value => value.trim());
    const numbers = parts.map(Number);

    if (parts.length !== 2 || !numbers.every(Number.isInteger)) {
      return {
        ok: false,
        error: `${index + 1}번째 줄은 "2:1" 형식으로 입력해 주세요.`
      };
    }

    fixedAssignments.push({
      student: numbers[0],
      group: numbers[1]
    });
  }

  return { ok: true, fixedAssignments };
}

function normalizePairs(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map(pair => Array.isArray(pair) ? pair.map(Number) : [])
    .filter(pair => pair.length === 2 && pair.every(Number.isInteger));
}

function normalizeFixedAssignments(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map(item => ({
      student: Number(item.student),
      group: Number(item.group)
    }))
    .filter(item => Number.isInteger(item.student) && Number.isInteger(item.group));
}

function normalizeGroupingConfig(config = {}) {
  return {
    studentCount: Number.isInteger(Number(config.studentCount))
      ? Number(config.studentCount)
      : DEFAULT_GROUPING_CONFIG.studentCount,
    groupCount: Number.isInteger(Number(config.groupCount))
      ? Number(config.groupCount)
      : DEFAULT_GROUPING_CONFIG.groupCount,
    separatePairs: normalizePairs(config.separatePairs),
    togetherPairs: normalizePairs(config.togetherPairs),
    fixedAssignments: normalizeFixedAssignments(config.fixedAssignments)
  };
}

function loadGroupingConfig() {
  try {
    const saved = window.localStorage.getItem(GROUPING_STORAGE_KEY);
    if (!saved) return getDefaultGroupingConfig();

    const normalized = normalizeGroupingConfig(JSON.parse(saved));
    return validateGroupingConfig(normalized) ? getDefaultGroupingConfig() : normalized;
  } catch (_error) {
    return getDefaultGroupingConfig();
  }
}

function saveGroupingConfig(config) {
  const normalized = normalizeGroupingConfig(config);
  const error = validateGroupingConfig(normalized);

  if (error) {
    return { ok: false, error };
  }

  const data = {
    version: 1,
    ...normalized
  };

  window.localStorage.setItem(GROUPING_STORAGE_KEY, JSON.stringify(data));

  return {
    ok: true,
    config: normalized
  };
}

function resetGroupingConfig() {
  window.localStorage.removeItem(GROUPING_STORAGE_KEY);
  return getDefaultGroupingConfig();
}

function getGroupCapacities(studentCount, groupCount) {
  const baseSize = Math.floor(studentCount / groupCount);
  const largerGroupCount = studentCount % groupCount;

  return Array.from(
    { length: groupCount },
    (_, index) => baseSize + (index < largerGroupCount ? 1 : 0)
  );
}

function createFinder(studentCount) {
  const parent = Array.from({ length: studentCount + 1 }, (_, index) => index);

  function find(student) {
    if (parent[student] !== student) {
      parent[student] = find(parent[student]);
    }
    return parent[student];
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);

    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  }

  return { find, union };
}

function validatePairList(pairs, studentCount, label) {
  for (const [a, b] of pairs) {
    if (a < 1 || b < 1 || a > studentCount || b > studentCount) {
      return `${label} 조건 ${a}-${b} 중 학생 번호가 범위를 벗어났습니다.`;
    }

    if (a === b) {
      return `${label} 조건 ${a}-${b}는 같은 학생을 한 쌍으로 입력했습니다.`;
    }
  }

  return "";
}

function buildComponents(config) {
  const finder = createFinder(config.studentCount);

  config.togetherPairs.forEach(([a, b]) => {
    finder.union(a, b);
  });

  const byRoot = new Map();

  for (let student = 1; student <= config.studentCount; student++) {
    const root = finder.find(student);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(student);
  }

  const fixedByStudent = new Map();

  for (const item of config.fixedAssignments) {
    if (!fixedByStudent.has(item.student)) {
      fixedByStudent.set(item.student, item.group);
    }
  }

  return [...byRoot.values()].map(students => {
    const fixedGroups = [...new Set(
      students
        .map(student => fixedByStudent.get(student))
        .filter(group => group !== undefined)
    )];

    return {
      students,
      fixedGroup: fixedGroups.length === 1 ? fixedGroups[0] : null,
      fixedGroups
    };
  });
}

function validateGroupingConfig(config) {
  const { studentCount, groupCount, separatePairs, togetherPairs, fixedAssignments } = config;

  if (studentCount < 1) return "학생 수는 1명 이상이어야 합니다.";
  if (groupCount < 1) return "모둠 수는 1개 이상이어야 합니다.";
  if (studentCount > 60) return "학생 수는 60명 이하로 입력해 주세요.";
  if (groupCount > studentCount) return "학생 수보다 모둠 수가 많아 편성할 수 없습니다.";

  const separateError = validatePairList(separatePairs, studentCount, "같은 모둠 금지");
  if (separateError) return separateError;

  const togetherError = validatePairList(togetherPairs, studentCount, "같은 모둠 우선");
  if (togetherError) return togetherError;

  const fixedByStudent = new Map();

  for (const { student, group } of fixedAssignments) {
    if (student < 1 || student > studentCount) {
      return `고정 조건의 ${student}번 학생이 학생 번호 범위를 벗어났습니다.`;
    }

    if (group < 1 || group > groupCount) {
      return `${student}번 학생의 고정 모둠 ${group}모둠이 모둠 범위를 벗어났습니다.`;
    }

    if (fixedByStudent.has(student) && fixedByStudent.get(student) !== group) {
      return `${student}번 학생이 서로 다른 모둠에 중복 고정되어 있습니다.`;
    }

    fixedByStudent.set(student, group);
  }

  for (const [a, b] of togetherPairs) {
    const fixedA = fixedByStudent.get(a);
    const fixedB = fixedByStudent.get(b);

    if (fixedA && fixedB && fixedA !== fixedB) {
      return `${a}번 학생은 ${fixedA}모둠, ${b}번 학생은 ${fixedB}모둠에 고정되어 있어 같은 모둠 우선 조건 ${a}-${b}와 충돌합니다.`;
    }
  }

  const finder = createFinder(studentCount);
  togetherPairs.forEach(([a, b]) => finder.union(a, b));

  for (const [a, b] of separatePairs) {
    if (finder.find(a) === finder.find(b)) {
      return `${a}-${b} 조건이 같은 모둠 금지와 같은 모둠 우선에 동시에 걸려 있습니다.`;
    }
  }

  const capacities = getGroupCapacities(studentCount, groupCount);
  const components = buildComponents(config);
  const fixedLoad = Array(groupCount).fill(0);

  for (const component of components) {
    if (component.fixedGroups.length > 1) {
      return `같은 모둠으로 묶인 학생들이 서로 다른 모둠에 고정되어 있습니다.`;
    }

    const largestCapacity = Math.max(...capacities);

    if (component.students.length > largestCapacity) {
      return `${component.students.join(", ")}번 학생 묶음이 가장 큰 모둠 인원보다 많습니다.`;
    }

    if (component.fixedGroup) {
      const capacity = capacities[component.fixedGroup - 1];

      if (component.students.length > capacity) {
        return `${component.fixedGroup}모둠에 고정된 학생 묶음이 해당 모둠에 들어가기에는 너무 많습니다.`;
      }

      fixedLoad[component.fixedGroup - 1] += component.students.length;
    }
  }

  const overloadIndex = fixedLoad.findIndex((count, index) => count > capacities[index]);
  if (overloadIndex !== -1) {
    return `${overloadIndex + 1}모둠에 고정된 학생 수가 너무 많아 균등하게 편성할 수 없습니다.`;
  }

  return "";
}

function groupIndexByStudent(groups) {
  const indexByStudent = new Map();

  groups.forEach((group, groupIndex) => {
    group.forEach(student => indexByStudent.set(student, groupIndex));
  });

  return indexByStudent;
}

function validateGroupingResult(groups, config, capacities) {
  if (groups.some((group, index) => group.length !== capacities[index])) return false;

  const indexByStudent = groupIndexByStudent(groups);

  for (const [a, b] of config.togetherPairs) {
    if (indexByStudent.get(a) !== indexByStudent.get(b)) return false;
  }

  for (const [a, b] of config.separatePairs) {
    if (indexByStudent.get(a) === indexByStudent.get(b)) return false;
  }

  for (const { student, group } of config.fixedAssignments) {
    if (indexByStudent.get(student) !== group - 1) return false;
  }

  return true;
}

function tryPlaceComponents(config, capacities) {
  const components = buildComponents(config);
  const groups = Array.from({ length: config.groupCount }, () => []);
  const fixedComponents = shuffle(components.filter(component => component.fixedGroup));
  const freeComponents = shuffle(components.filter(component => !component.fixedGroup))
    .sort((a, b) => b.students.length - a.students.length);

  for (const component of fixedComponents) {
    const groupIndex = component.fixedGroup - 1;

    if (groups[groupIndex].length + component.students.length > capacities[groupIndex]) {
      return null;
    }

    groups[groupIndex].push(...shuffle(component.students));
  }

  for (const component of freeComponents) {
    const available = groups
      .map((group, index) => ({
        index,
        remaining: capacities[index] - group.length
      }))
      .filter(item => item.remaining >= component.students.length);

    if (!available.length) return null;

    const largestRemaining = Math.max(...available.map(item => item.remaining));
    const choices = available.filter(item => item.remaining === largestRemaining);
    const choice = shuffle(choices)[0];

    groups[choice.index].push(...shuffle(component.students));
  }

  groups.forEach((group, index) => {
    groups[index] = shuffle(group);
  });

  return groups;
}

function generateGrouping(config = {}) {
  const normalized = normalizeGroupingConfig(config);
  const error = validateGroupingConfig(normalized);

  if (error) {
    return { ok: false, error };
  }

  const capacities = getGroupCapacities(normalized.studentCount, normalized.groupCount);
  const maxAttempts = Number.isInteger(Number(config.maxAttempts))
    ? Number(config.maxAttempts)
    : 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const groups = tryPlaceComponents(normalized, capacities);

    if (groups && validateGroupingResult(groups, normalized, capacities)) {
      return {
        ok: true,
        groups,
        attempts: attempt + 1,
        capacities
      };
    }
  }

  return {
    ok: false,
    error: "현재 조건으로 모둠을 만들기 어렵습니다. 금지 조건이나 고정 조건을 줄여 주세요."
  };
}
