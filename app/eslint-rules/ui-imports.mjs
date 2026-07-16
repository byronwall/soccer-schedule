const UI_DIRECTORY_FRAGMENT = "/src/components/ui/";

const getFilename = (context) => {
  if (typeof context.getFilename === "function") {
    return context.getFilename();
  }
  return context.filename ?? context.physicalFilename ?? "<text>";
};

const normalizePath = (value) => value.replaceAll("\\", "/");

const isUiInternalFile = (filename) => {
  const normalized = normalizePath(filename);
  return (
    normalized.includes(UI_DIRECTORY_FRAGMENT) ||
    normalized.startsWith("src/components/ui/")
  );
};

const isUiSubpathImport = (source) => {
  const normalized = normalizePath(source);
  return (
    /^[@~]\/components\/ui\/.+/.test(normalized) ||
    /(?:^|\/)components\/ui\/.+/.test(normalized)
  );
};

const reportIfUiSubpathSource = (context, source) => {
  if (!source || typeof source.value !== "string") return;
  if (!isUiSubpathImport(source.value)) return;

  context.report({
    node: source,
    messageId: "preferIndex",
    data: {
      source: source.value,
    },
  });
};

const reportIfUiSubpathImport = (context, node) => {
  reportIfUiSubpathSource(context, node.source);
};

export default {
  rules: {
    "no-ui-subpath-imports": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require downstream shared UI imports to use the components/ui index.",
        },
        messages: {
          preferIndex:
            "Import shared UI from the components/ui index instead of '{{source}}'. Add missing exports to src/components/ui/index.ts when adding a new component.",
        },
        schema: [],
      },
      create(context) {
        if (isUiInternalFile(getFilename(context))) {
          return {};
        }

        return {
          ExportAllDeclaration(node) {
            reportIfUiSubpathImport(context, node);
          },
          ExportNamedDeclaration(node) {
            reportIfUiSubpathImport(context, node);
          },
          ImportDeclaration(node) {
            reportIfUiSubpathImport(context, node);
          },
          ImportExpression(node) {
            reportIfUiSubpathSource(context, node.source);
          },
        };
      },
    },
  },
};
