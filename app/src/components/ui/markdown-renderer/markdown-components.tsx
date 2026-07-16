import { A } from "@solidjs/router";
import type { SolidMarkdownComponents } from "solid-markdown";
import { Show, splitProps, type JSX } from "solid-js";
import { Text } from "~/components/ui/text";
import { MarkdownCode } from "./markdown-code";
import { MarkdownHeading } from "./markdown-heading";
import { MarkdownPre } from "./markdown-pre";
import { markdownStyles } from "./markdown-styles";
import { markdownTableComponents } from "./markdown-table-components";

type MarkdownAnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: JSX.Element;
  index?: number;
  node?: unknown;
  siblingCount?: number;
  sourcePosition?: unknown;
};

type MarkdownImageProps = JSX.ImgHTMLAttributes<HTMLImageElement> & {
  index?: number;
  node?: unknown;
  siblingCount?: number;
  sourcePosition?: unknown;
};

function isAppRoute(href: string | undefined): href is string {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"));
}

const MarkdownAnchor = (props: MarkdownAnchorProps) => {
  const [local, rest] = splitProps(props, [
    "children",
    "href",
    "index",
    "node",
    "siblingCount",
    "sourcePosition",
  ]);

  return (
    <Show
      when={isAppRoute(local.href) ? local.href : undefined}
      fallback={
        <a class={markdownStyles.a} href={local.href} {...rest}>
          {local.children}
        </a>
      }
    >
      {(href) => (
        <A class={markdownStyles.a} href={href()} {...rest}>
          {local.children}
        </A>
      )}
    </Show>
  );
};

const MarkdownImage = (props: MarkdownImageProps) => {
  const [, rest] = splitProps(props, [
    "index",
    "node",
    "siblingCount",
    "sourcePosition",
  ]);

  return (
    <img
      class={markdownStyles.img}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
};

export const markdownComponents = {
  h1: (props) => (
    <MarkdownHeading as="h1" headingClass={markdownStyles.h1} {...props} />
  ),
  h2: (props) => (
    <MarkdownHeading as="h2" headingClass={markdownStyles.h2} {...props} />
  ),
  h3: (props) => (
    <MarkdownHeading as="h3" headingClass={markdownStyles.h3} {...props} />
  ),
  h4: (props) => (
    <MarkdownHeading as="h4" headingClass={markdownStyles.h4} {...props} />
  ),
  h5: (props) => (
    <MarkdownHeading as="h5" headingClass={markdownStyles.h5} {...props} />
  ),
  p: (props) => <Text class={markdownStyles.p} {...props} />,
  a: MarkdownAnchor,
  img: MarkdownImage,
  ul: (props) => <ul class={markdownStyles.ul} {...props} />,
  ol: (props) => <ol class={markdownStyles.ol} {...props} />,
  li: (props) => <li class={markdownStyles.li} {...props} />,
  blockquote: (props) => (
    <blockquote class={markdownStyles.blockquote} {...props} />
  ),
  pre: MarkdownPre,
  code: MarkdownCode,
  ...markdownTableComponents,
} satisfies SolidMarkdownComponents;
