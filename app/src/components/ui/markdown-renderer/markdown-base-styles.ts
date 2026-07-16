import { css } from "styled-system/css";

export const markdownBaseStyles = {
  h1: css({ fontSize: "2xl", fontWeight: "bold", mt: 6, mb: 4 }),
  h2: css({ fontSize: "xl", fontWeight: "semibold", mt: 4, mb: 2 }),
  h3: css({ fontSize: "lg", fontWeight: "medium", mt: 3, mb: 1 }),
  h4: css({ fontSize: "md", fontWeight: "semibold", mt: 3, mb: 1 }),
  h5: css({ fontSize: "sm", fontWeight: "semibold", mt: 3, mb: 1 }),
  headingTarget: css({
    scrollMarginTop: "96px",
    position: "relative",
    overflow: "visible",
    "& [data-heading-anchor='true']": {
      opacity: 0,
      pointerEvents: "auto",
    },
    "&:hover [data-heading-anchor='true']": {
      opacity: 1,
    },
    "& [data-heading-anchor='true']:hover": {
      opacity: 1,
    },
    "& [data-heading-anchor='true']:focus-visible": {
      opacity: 1,
    },
  }),
  headingAnchor: css({
    position: "absolute",
    left: "-1.1rem",
    top: "50%",
    transform: "translateY(-50%)",
    opacity: 0,
    color: "fg.muted",
    textDecoration: "none",
    fontSize: "0.85em",
    transition: "opacity 120ms ease",
    _hover: { color: "fg.default" },
  }),
  p: css({ fontSize: "md", lineHeight: "relaxed", mb: 3 }),
  a: css({ color: "accent.default", textDecoration: "underline" }),
  img: css({
    display: "block",
    maxW: "100%",
    h: "auto",
    my: 4,
    borderWidth: "1px",
    borderColor: "border",
    borderRadius: "md",
    bg: "bg.subtle",
  }),
  ul: css({ listStyleType: "disc", pl: 6, mb: 4 }),
  ol: css({ listStyleType: "decimal", pl: 6, mb: 4 }),
  li: css({ mb: 1 }),
  blockquote: css({
    borderLeftWidth: "4px",
    borderLeftColor: "border.subtle",
    pl: 4,
    py: 1,
    my: 4,
    fontStyle: "italic",
    color: "fg.muted",
  }),
};
