const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_FOLDER_CHARS = /[\\:*?"<>|]/;

const DEFAULT_FOLDER_STATE = {
  mode: "simple",
  simpleText: "1반\n2반\n3반",
  numberPrefix: "",
  numberBase: "반",
  numberSuffix: "",
  startNumber: 1,
  endNumber: 12,
  numberDigits: 1,
  numberPosition: "before",
  treeText: "2026학년도/1학년/1반\n2026학년도/1학년/2반\n2026학년도/2학년/1반"
};

const FOLDER_TEMPLATES = {
  classes: {
    mode: "number",
    numberPrefix: "",
    numberBase: "반",
    numberSuffix: "",
    startNumber: 1,
    endNumber: 12,
    numberDigits: 1,
    numberPosition: "before"
  },
  grades: {
    mode: "simple",
    simpleText: "1학년\n2학년\n3학년"
  },
  months: {
    mode: "number",
    numberPrefix: "",
    numberBase: "월",
    numberSuffix: "",
    startNumber: 1,
    endNumber: 12,
    numberDigits: 2,
    numberPosition: "before"
  },
  lessons: {
    mode: "number",
    numberPrefix: "",
    numberBase: "차시",
    numberSuffix: "",
    startNumber: 1,
    endNumber: 17,
    numberDigits: 2,
    numberPosition: "before"
  },
  homeroom: {
    mode: "tree",
    treeText: "학급/가정통신문\n학급/상담\n학급/체험학습\n학급/생활지도\n학급/학급행사\n학급/기타"
  }
};

function getDefaultFolderState() {
  return { ...DEFAULT_FOLDER_STATE };
}

function padNumber(value, digits) {
  return String(value).padStart(Math.max(1, digits), "0");
}

function splitSimpleNames(text = "") {
  return text
    .split(/[\n,]+/)
    .map(name => name.trim())
    .filter(Boolean)
    .map(name => [name]);
}

function buildNumberedPaths(options) {
  const startNumber = Number(options.startNumber);
  const endNumber = Number(options.endNumber);
  const digits = Number(options.numberDigits);
  const paths = [];

  if (!Number.isInteger(startNumber) || !Number.isInteger(endNumber)) {
    return {
      ok: false,
      error: "시작 번호와 끝 번호는 정수로 입력해 주세요."
    };
  }

  if (startNumber > endNumber) {
    return {
      ok: false,
      error: "시작 번호가 끝 번호보다 클 수 없습니다."
    };
  }

  if (!Number.isInteger(digits) || digits < 1 || digits > 8) {
    return {
      ok: false,
      error: "번호 자릿수는 1부터 8 사이로 입력해 주세요."
    };
  }

  if (endNumber - startNumber > 500) {
    return {
      ok: false,
      error: "한 번에 자동 생성할 번호 범위는 501개 이하로 입력해 주세요."
    };
  }

  for (let value = startNumber; value <= endNumber; value++) {
    const numberText = padNumber(value, digits);
    const folderName = options.numberPosition === "before"
      ? `${options.numberPrefix}${numberText}${options.numberBase}${options.numberSuffix}`
      : `${options.numberPrefix}${options.numberBase}${numberText}${options.numberSuffix}`;

    paths.push([folderName]);
  }

  return { ok: true, paths };
}

function splitPathLine(line) {
  return line
    .split("/")
    .map(part => part.trim());
}

function parseTreePaths(text = "") {
  return text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(splitPathLine);
}

function getTemplateState(templateKey) {
  return {
    ...getDefaultFolderState(),
    ...(FOLDER_TEMPLATES[templateKey] || {})
  };
}

function buildInputPaths(state) {
  if (state.mode === "simple") {
    return { ok: true, paths: splitSimpleNames(state.simpleText) };
  }

  if (state.mode === "number") {
    return buildNumberedPaths(state);
  }

  if (state.mode === "tree") {
    return { ok: true, paths: parseTreePaths(state.treeText) };
  }

  return {
    ok: false,
    error: "생성 방식을 확인해 주세요."
  };
}

function getPathKey(parts) {
  return parts.join("/").toLowerCase();
}

function getDisplayPath(parts) {
  return parts.join("/");
}

function expandWithParentPaths(paths) {
  const expanded = [];
  const seen = new Set();

  paths.forEach(parts => {
    for (let depth = 1; depth <= parts.length; depth++) {
      const partial = parts.slice(0, depth);
      const key = getPathKey(partial);

      if (!seen.has(key)) {
        seen.add(key);
        expanded.push(partial);
      }
    }
  });

  return expanded;
}

function validateFolderPart(part, fullPath) {
  const errors = [];

  if (!part.trim()) {
    errors.push(`${fullPath || "(빈 이름)"}: 빈 폴더명이 있습니다.`);
    return errors;
  }

  const invalidMatch = part.match(INVALID_FOLDER_CHARS);
  if (invalidMatch) {
    errors.push(`${fullPath}: 사용할 수 없는 문자 "${invalidMatch[0]}"가 포함되어 있습니다.`);
  }

  if (part.includes("/")) {
    errors.push(`${fullPath}: 사용할 수 없는 문자 "/"가 포함되어 있습니다.`);
  }

  if (part.endsWith(".") || part.endsWith(" ")) {
    errors.push(`${fullPath}: 이름 끝에 마침표나 공백을 사용할 수 없습니다.`);
  }

  const baseName = part.split(".")[0];
  if (RESERVED_WINDOWS_NAMES.test(baseName)) {
    errors.push(`${fullPath}: Windows 예약 이름이라 문제가 생길 수 있습니다.`);
  }

  return errors;
}

function validateFolderPaths(paths) {
  const errors = [];
  const inputCounts = new Map();

  paths.forEach(parts => {
    const displayPath = getDisplayPath(parts);
    inputCounts.set(getPathKey(parts), (inputCounts.get(getPathKey(parts)) || 0) + 1);

    if (!parts.length) {
      errors.push("(빈 입력): 폴더명을 입력해 주세요.");
      return;
    }

    parts.forEach(part => {
      errors.push(...validateFolderPart(part, displayPath));
    });
  });

  paths.forEach(parts => {
    if (inputCounts.get(getPathKey(parts)) > 1) {
      errors.push(`${getDisplayPath(parts)}: 동일한 폴더명이 중복되었습니다.`);
    }
  });

  return [...new Set(errors)];
}

function buildFolderTree(paths) {
  const root = {
    name: "",
    children: [],
    childMap: new Map()
  };

  paths.forEach(parts => {
    let node = root;

    parts.forEach(part => {
      const key = part.toLowerCase();

      if (!node.childMap.has(key)) {
        const child = {
          name: part,
          children: [],
          childMap: new Map()
        };

        node.childMap.set(key, child);
        node.children.push(child);
      }

      node = node.childMap.get(key);
    });
  });

  function clean(node) {
    return {
      name: node.name,
      children: node.children.map(clean)
    };
  }

  return root.children.map(clean);
}

function createFolderPlan(state) {
  const built = buildInputPaths(state);

  if (!built.ok) {
    return {
      ok: false,
      inputPaths: [],
      allPaths: [],
      tree: [],
      errors: [built.error]
    };
  }

  const inputPaths = built.paths;
  const errors = validateFolderPaths(inputPaths);
  const allPaths = expandWithParentPaths(inputPaths);

  if (!inputPaths.length) {
    errors.push("생성할 폴더명을 입력해 주세요.");
  }

  return {
    ok: errors.length === 0,
    inputPaths,
    allPaths,
    tree: buildFolderTree(allPaths),
    errors
  };
}

async function directoryExists(parentHandle, name) {
  try {
    await parentHandle.getDirectoryHandle(name);
    return true;
  } catch (error) {
    if (error && error.name === "NotFoundError") return false;
    throw error;
  }
}

async function getOrCreateChildDirectory(parentHandle, name, isLeaf, stats, pathText) {
  const exists = await directoryExists(parentHandle, name);

  if (exists) {
    if (isLeaf) {
      stats.skipped.push(pathText);
    }

    return parentHandle.getDirectoryHandle(name);
  }

  const childHandle = await parentHandle.getDirectoryHandle(name, { create: true });
  stats.created.push(pathText);
  return childHandle;
}

async function createFoldersAt(directoryHandle, paths) {
  const stats = {
    created: [],
    skipped: [],
    failed: []
  };

  for (const parts of paths) {
    let currentHandle = directoryHandle;
    let currentParts = [];

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const isLeaf = index === parts.length - 1;

      currentParts.push(part);

      try {
        currentHandle = await getOrCreateChildDirectory(
          currentHandle,
          part,
          isLeaf,
          stats,
          getDisplayPath(currentParts)
        );
      } catch (error) {
        stats.failed.push({
          path: getDisplayPath(currentParts),
          message: error && error.message ? error.message : "생성 실패"
        });
        break;
      }
    }
  }

  return stats;
}
