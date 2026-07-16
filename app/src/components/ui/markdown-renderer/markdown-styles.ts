import { markdownBaseStyles } from "./markdown-base-styles";
import { CODE_BLOCK_COLLAPSED_HEIGHT, markdownCodeStyles } from "./markdown-code-styles";
import { markdownMermaidStyles } from "./markdown-mermaid-styles";

export { CODE_BLOCK_COLLAPSED_HEIGHT };

export const markdownStyles = {
  ...markdownBaseStyles,
  ...markdownCodeStyles,
  ...markdownMermaidStyles,
};
