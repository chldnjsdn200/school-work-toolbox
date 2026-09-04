const INVALID_WINDOWS_FILENAME_CHARS = /[\\/:*?"<>|]/;

const DEFAULT_RENAME_OPTIONS = {
  prefix: "",
  suffix: "",
  findText: "",
  replaceText: "",
  removeText: "",
  numberingEnabled: false,
  numberingBase: "",
  startNumber: 1,
  numberDigits: 3
};

function splitFileName(fileName) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return {
      baseName: fileName,
      extension: ""
    };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex)
  };
}

function normalizeRenameOptions(options = {}) {
  return {
    prefix: String(options.prefix ?? ""),
    suffix: String(options.suffix ?? ""),
    findText: String(options.findText ?? ""),
    replaceText: String(options.replaceText ?? ""),
    removeText: String(options.removeText ?? ""),
    numberingEnabled: Boolean(options.numberingEnabled),
    numberingBase: String(options.numberingBase ?? ""),
    startNumber: Number.isInteger(Number(options.startNumber))
      ? Number(options.startNumber)
      : DEFAULT_RENAME_OPTIONS.startNumber,
    numberDigits: Number.isInteger(Number(options.numberDigits))
      ? Number(options.numberDigits)
      : DEFAULT_RENAME_OPTIONS.numberDigits
  };
}

function getDefaultRenameOptions() {
  return { ...DEFAULT_RENAME_OPTIONS };
}

function replaceAllLiteral(text, searchValue, replaceValue) {
  if (!searchValue) return text;
  return text.split(searchValue).join(replaceValue);
}

function padNumber(value, digits) {
  return String(value).padStart(Math.max(1, digits), "0");
}

function buildNewBaseName(originalBaseName, options, index) {
  if (options.numberingEnabled) {
    return `${options.numberingBase}${padNumber(options.startNumber + index, options.numberDigits)}`;
  }

  let nextName = originalBaseName;
  nextName = replaceAllLiteral(nextName, options.findText, options.replaceText);
  nextName = replaceAllLiteral(nextName, options.removeText, "");
  nextName = `${options.prefix}${nextName}${options.suffix}`;

  return nextName;
}

function containsInvalidWindowsChars(fileName) {
  return INVALID_WINDOWS_FILENAME_CHARS.test(fileName);
}

function createRenamePreview(files, options) {
  const normalized = normalizeRenameOptions(options);

  return Array.from(files).map((file, index) => {
    const { baseName, extension } = splitFileName(file.name);
    const newBaseName = buildNewBaseName(baseName, normalized, index);
    const newName = `${newBaseName}${extension}`;

    return {
      file,
      originalName: file.name,
      originalBaseName: baseName,
      extension,
      newBaseName,
      newName,
      errors: []
    };
  });
}

function validateRenamePreview(previewRows) {
  const nameCounts = new Map();

  previewRows.forEach(row => {
    const key = row.newName.toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  });

  previewRows.forEach(row => {
    row.errors = [];

    if (!row.newBaseName.trim()) {
      row.errors.push("파일명이 비어 있습니다.");
    }

    if (containsInvalidWindowsChars(row.newBaseName) || containsInvalidWindowsChars(row.extension)) {
      row.errors.push('Windows 파일명에 사용할 수 없는 문자가 포함되어 있습니다. \\ / : * ? " < > |');
    }

    if (nameCounts.get(row.newName.toLowerCase()) > 1) {
      row.errors.push("변경 후 같은 파일명이 여러 개 생깁니다.");
    }
  });

  const errors = [...new Set(previewRows.flatMap(row => row.errors))];

  return {
    ok: errors.length === 0,
    errors,
    rows: previewRows
  };
}

function planRename(files, options) {
  const previewRows = createRenamePreview(files, options);
  return validateRenamePreview(previewRows);
}
