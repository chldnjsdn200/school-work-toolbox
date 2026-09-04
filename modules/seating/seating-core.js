const SEATING_STORAGE_KEY = "schoolWorkToolbox.seating.config.v1";

const DEFAULT_SEATING_CONFIG = {
  studentCount: 27,
  cols: 6,
  rows: 5,
  frontPriority: [],
  separatePairs: []
};

function getDefaultSeatingConfig() {
  return {
    studentCount: DEFAULT_SEATING_CONFIG.studentCount,
    cols: DEFAULT_SEATING_CONFIG.cols,
    rows: DEFAULT_SEATING_CONFIG.rows,
    frontPriority: [],
    separatePairs: []
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

function coordOf(index, cols) {
  return {
    row: Math.floor(index / cols),
    col: index % cols
  };
}

function areAdjacent(aIndex, bIndex, cols) {
  const a = coordOf(aIndex, cols);
  const b = coordOf(bIndex, cols);
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);

  // 좌우, 앞뒤, 대각선까지 인접으로 처리
  return rowDiff <= 1 && colDiff <= 1;
}

function parseNumberList(text) {
  if (!text.trim()) return [];

  return [...new Set(
    text
      .split(",")
      .map(v => Number(v.trim()))
      .filter(Number.isInteger)
  )];
}

function parsePairs(text) {
  if (!text.trim()) return [];

  return text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/[-~,]/).map(v => Number(v.trim())))
    .filter(pair => pair.length === 2 && pair.every(Number.isInteger));
}

function uniqueValidNumbers(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map(Number)
      .filter(Number.isInteger)
  )];
}

function normalizePairs(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map(pair => Array.isArray(pair) ? pair.map(Number) : [])
    .filter(pair => pair.length === 2 && pair.every(Number.isInteger));
}

function normalizeSeatingConfig(config = {}) {
  return {
    studentCount: Number.isInteger(Number(config.studentCount))
      ? Number(config.studentCount)
      : DEFAULT_SEATING_CONFIG.studentCount,
    cols: Number.isInteger(Number(config.cols))
      ? Number(config.cols)
      : DEFAULT_SEATING_CONFIG.cols,
    rows: Number.isInteger(Number(config.rows))
      ? Number(config.rows)
      : DEFAULT_SEATING_CONFIG.rows,
    frontPriority: uniqueValidNumbers(config.frontPriority),
    separatePairs: normalizePairs(config.separatePairs)
  };
}

function loadSeatingConfig() {
  try {
    const saved = window.localStorage.getItem(SEATING_STORAGE_KEY);
    if (!saved) return getDefaultSeatingConfig();

    const parsed = JSON.parse(saved);
    const normalized = normalizeSeatingConfig(parsed);
    return validateInputs(normalized) ? getDefaultSeatingConfig() : normalized;
  } catch (_error) {
    return getDefaultSeatingConfig();
  }
}

function saveSeatingConfig(config) {
  const normalized = normalizeSeatingConfig(config);
  const error = validateInputs(normalized);

  if (error) {
    return { ok: false, error };
  }

  const data = {
    version: 1,
    ...normalized
  };

  window.localStorage.setItem(SEATING_STORAGE_KEY, JSON.stringify(data));

  return {
    ok: true,
    config: normalized
  };
}

function resetSeatingConfig() {
  window.localStorage.removeItem(SEATING_STORAGE_KEY);
  return getDefaultSeatingConfig();
}

function validateInputs({ studentCount, rows, cols, frontPriority, separatePairs }) {
  if (studentCount < 1) return "학생 수는 1명 이상이어야 함";
  if (rows < 1 || cols < 1) return "가로/세로 좌석 수는 1 이상이어야 함";
  if (rows * cols < studentCount) return "좌석 수가 학생 수보다 적음";

  const invalidFront = frontPriority.find(n => n < 1 || n > studentCount);
  if (invalidFront) return `앞자리 우선 학생 ${invalidFront}번이 학생 범위를 벗어남`;

  for (const [a, b] of separatePairs) {
    if (a < 1 || b < 1 || a > studentCount || b > studentCount) {
      return `분리 조건 ${a}-${b} 중 학생 번호가 범위를 벗어남`;
    }
    if (a === b) {
      return `분리 조건 ${a}-${b}는 같은 학생임`;
    }
  }

  return "";
}

function generateSeating(config) {
  const {
    studentCount,
    rows,
    cols,
    frontPriority = [],
    separatePairs = [],
    maxAttempts = 5000
  } = config;

  const error = validateInputs(config);
  if (error) {
    return { ok: false, error };
  }

  const students = Array.from({ length: studentCount }, (_, i) => i + 1);
  const totalSeats = rows * cols;
  const frontRows = Math.min(2, rows);
  const frontSeatIndexes = Array.from(
    { length: frontRows * cols },
    (_, i) => i
  );

  if (frontPriority.length > frontSeatIndexes.length) {
    return {
      ok: false,
      error: `앞자리 우선 학생이 너무 많음 · 앞 2줄 좌석은 ${frontSeatIndexes.length}개임`
    };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seats = Array(totalSeats).fill(null);

    // 1) 앞자리 우선 학생부터 앞 2줄에 무작위 배치
    const priorityStudents = shuffle(frontPriority);
    const prioritySeats = shuffle(frontSeatIndexes).slice(0, priorityStudents.length);

    priorityStudents.forEach((student, i) => {
      seats[prioritySeats[i]] = student;
    });

    // 2) 나머지 학생은 남은 좌석에 무작위 배치
    const prioritySet = new Set(frontPriority);
    const remainingStudents = shuffle(students.filter(s => !prioritySet.has(s)));
    const availableSeats = shuffle(
      seats.map((value, index) => value === null ? index : null).filter(v => v !== null)
    );

    remainingStudents.forEach((student, i) => {
      seats[availableSeats[i]] = student;
    });

    // 3) 분리 조건 검사
    let valid = true;

    for (const [a, b] of separatePairs) {
      const aIndex = seats.indexOf(a);
      const bIndex = seats.indexOf(b);

      if (aIndex === -1 || bIndex === -1 || areAdjacent(aIndex, bIndex, cols)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return {
        ok: true,
        seats,
        attempts: attempt + 1
      };
    }
  }

  return {
    ok: false,
    error: "현재 조건으로 배치하기 어려움 · 분리 조건을 줄이거나 좌석 수를 늘려야 함"
  };
}
