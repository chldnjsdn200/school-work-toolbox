const DEFAULT_COMPARE_OPTIONS = {
  trimWhitespace: true,
  removeEmpty: true,
  ignoreCase: true,
  ignoreAllWhitespace: false,
  numericCompare: false,
  uniqueForCompare: true,
  sortMode: "input"
};

const RESULT_DEFINITIONS = [
  ["common", "공통값"],
  ["onlyA", "A에만 있음"],
  ["onlyB", "B에만 있음"],
  ["duplicatesA", "A 중복"],
  ["duplicatesB", "B 중복"]
];

function getDefaultCompareOptions() {
  return { ...DEFAULT_COMPARE_OPTIONS };
}

function normalizeCompareOptions(options = {}) {
  const merged = {
    ...DEFAULT_COMPARE_OPTIONS,
    ...options
  };

  return {
    trimWhitespace: Boolean(merged.trimWhitespace),
    removeEmpty: Boolean(merged.removeEmpty),
    ignoreCase: Boolean(merged.ignoreCase),
    ignoreAllWhitespace: Boolean(merged.ignoreAllWhitespace),
    numericCompare: Boolean(merged.numericCompare),
    uniqueForCompare: Boolean(merged.uniqueForCompare),
    sortMode: merged.sortMode || DEFAULT_COMPARE_OPTIONS.sortMode
  };
}

function splitListText(text = "") {
  return String(text).split(/[\n,;\t]+/);
}

function normalizeKey(value, options) {
  let key = options.trimWhitespace ? value.trim() : value;

  if (options.ignoreAllWhitespace) {
    key = key.replace(/\s+/g, "");
  }

  if (options.numericCompare) {
    const numberValue = Number(key);
    if (key !== "" && Number.isFinite(numberValue)) {
      return `number:${numberValue}`;
    }
  }

  if (options.ignoreCase) {
    key = key.toLocaleLowerCase("ko-KR");
  }

  return `text:${key}`;
}

function displayValue(value, options) {
  return options.trimWhitespace ? value.trim() : value;
}

function parseList(text, options) {
  const items = [];
  const counts = new Map();

  splitListText(text).forEach((rawValue, sourceIndex) => {
    const display = displayValue(rawValue, options);

    if (options.removeEmpty && display === "") {
      return;
    }

    const key = normalizeKey(rawValue, options);

    if (!counts.has(key)) {
      counts.set(key, {
        key,
        value: display,
        count: 0,
        firstIndex: items.length
      });
    }

    counts.get(key).count += 1;

    items.push({
      key,
      value: display,
      sourceIndex
    });
  });

  return {
    items,
    counts,
    unique: [...counts.values()]
  };
}

function compareTextValues(a, b) {
  return a.value.localeCompare(b.value, "ko-KR", {
    numeric: false,
    sensitivity: "base"
  });
}

function numberSortValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.POSITIVE_INFINITY;
}

function sortEntries(entries, sortMode) {
  const copy = [...entries];

  if (sortMode === "text-asc") {
    return copy.sort((a, b) => compareTextValues(a, b));
  }

  if (sortMode === "text-desc") {
    return copy.sort((a, b) => compareTextValues(b, a));
  }

  if (sortMode === "number-asc") {
    return copy.sort((a, b) => numberSortValue(a.value) - numberSortValue(b.value) || compareTextValues(a, b));
  }

  if (sortMode === "number-desc") {
    return copy.sort((a, b) => numberSortValue(b.value) - numberSortValue(a.value) || compareTextValues(a, b));
  }

  return copy.sort((a, b) => a.firstIndex - b.firstIndex);
}

function expandUniqueComparison(parsedA, parsedB, options) {
  const common = [];
  const onlyA = [];
  const onlyB = [];

  parsedA.unique.forEach(entry => {
    if (parsedB.counts.has(entry.key)) {
      common.push(entry);
    } else {
      onlyA.push(entry);
    }
  });

  parsedB.unique.forEach(entry => {
    if (!parsedA.counts.has(entry.key)) {
      onlyB.push(entry);
    }
  });

  return {
    common: sortEntries(common, options.sortMode),
    onlyA: sortEntries(onlyA, options.sortMode),
    onlyB: sortEntries(onlyB, options.sortMode)
  };
}

function expandMultiComparison(parsedA, parsedB, options) {
  const keys = new Set([...parsedA.counts.keys(), ...parsedB.counts.keys()]);
  const common = [];
  const onlyA = [];
  const onlyB = [];

  keys.forEach(key => {
    const aEntry = parsedA.counts.get(key);
    const bEntry = parsedB.counts.get(key);
    const aCount = aEntry ? aEntry.count : 0;
    const bCount = bEntry ? bEntry.count : 0;
    const commonCount = Math.min(aCount, bCount);

    for (let index = 0; index < commonCount; index++) {
      common.push({ ...(aEntry || bEntry), firstIndex: (aEntry || bEntry).firstIndex + index });
    }

    for (let index = 0; index < aCount - commonCount; index++) {
      onlyA.push({ ...aEntry, firstIndex: aEntry.firstIndex + index });
    }

    for (let index = 0; index < bCount - commonCount; index++) {
      onlyB.push({ ...bEntry, firstIndex: bEntry.firstIndex + index });
    }
  });

  return {
    common: sortEntries(common, options.sortMode),
    onlyA: sortEntries(onlyA, options.sortMode),
    onlyB: sortEntries(onlyB, options.sortMode)
  };
}

function duplicateEntries(parsed, options) {
  return sortEntries(
    parsed.unique.filter(entry => entry.count > 1),
    options.sortMode
  );
}

function compareLists(textA, textB, options = {}) {
  const normalizedOptions = normalizeCompareOptions(options);
  const parsedA = parseList(textA, normalizedOptions);
  const parsedB = parseList(textB, normalizedOptions);

  if (!parsedA.items.length && !parsedB.items.length) {
    return { ok: false, error: "비교할 목록을 입력해주세요" };
  }

  if (!parsedA.items.length) {
    return { ok: false, error: "A 목록이 비어 있습니다" };
  }

  if (!parsedB.items.length) {
    return { ok: false, error: "B 목록이 비어 있습니다" };
  }

  const compared = normalizedOptions.uniqueForCompare
    ? expandUniqueComparison(parsedA, parsedB, normalizedOptions)
    : expandMultiComparison(parsedA, parsedB, normalizedOptions);

  const duplicatesA = duplicateEntries(parsedA, normalizedOptions);
  const duplicatesB = duplicateEntries(parsedB, normalizedOptions);
  const warning = parsedA.items.length + parsedB.items.length > 10000
    ? "목록이 큽니다. 결과 표시가 잠시 걸릴 수 있습니다."
    : "";

  return {
    ok: true,
    options: normalizedOptions,
    parsedA,
    parsedB,
    summary: {
      totalA: parsedA.items.length,
      totalB: parsedB.items.length,
      uniqueA: parsedA.unique.length,
      uniqueB: parsedB.unique.length,
      common: compared.common.length,
      onlyA: compared.onlyA.length,
      onlyB: compared.onlyB.length,
      duplicatesA: duplicatesA.length,
      duplicatesB: duplicatesB.length
    },
    results: {
      common: compared.common,
      onlyA: compared.onlyA,
      onlyB: compared.onlyB,
      duplicatesA,
      duplicatesB
    },
    warning
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(result) {
  const rows = [["구분", "값", "등장횟수"]];

  [
    ["공통", result.results.common],
    ["A에만 있음", result.results.onlyA],
    ["B에만 있음", result.results.onlyB]
  ].forEach(([label, entries]) => {
    entries.forEach(entry => rows.push([label, entry.value, ""]));
  });

  [
    ["A 중복", result.results.duplicatesA],
    ["B 중복", result.results.duplicatesB]
  ].forEach(([label, entries]) => {
    entries.forEach(entry => rows.push([label, entry.value, entry.count]));
  });

  return `\uFEFF${rows.map(row => row.map(csvEscape).join(",")).join("\r\n")}`;
}

function makeDatedFileName(extension) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `목록비교결과_${yyyy}-${mm}-${dd}.${extension}`;
}

function sheetFromRows(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 16 }, { wch: 32 }, { wch: 12 }];
  return sheet;
}

function entriesToSheetRows(entries) {
  return [
    ["번호", "값"],
    ...entries.map((entry, index) => [index + 1, entry.value])
  ];
}

function duplicateEntriesToSheetRows(entries) {
  return [
    ["값", "등장 횟수"],
    ...entries.map(entry => [entry.value, entry.count])
  ];
}

function buildXlsxBlob(result) {
  if (!window.XLSX || !XLSX.utils || !XLSX.write) {
    throw new Error("Excel 저장 기능을 불러오지 못했습니다. CSV 형식으로 저장해주세요.");
  }

  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    ["항목", "개수"],
    ["A 목록", result.summary.totalA],
    ["B 목록", result.summary.totalB],
    ["공통값", result.summary.common],
    ["A에만 있음", result.summary.onlyA],
    ["B에만 있음", result.summary.onlyB],
    ["A 중복값", result.summary.duplicatesA],
    ["B 중복값", result.summary.duplicatesB]
  ];

  XLSX.utils.book_append_sheet(workbook, sheetFromRows(summaryRows), "요약");
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(entriesToSheetRows(result.results.common)), "공통값");
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(entriesToSheetRows(result.results.onlyA)), "A에만 있음");
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(entriesToSheetRows(result.results.onlyB)), "B에만 있음");
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(duplicateEntriesToSheetRows(result.results.duplicatesA)), "A 중복");
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(duplicateEntriesToSheetRows(result.results.duplicatesB)), "B 중복");

  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
