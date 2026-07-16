import {
  Match,
  Switch,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";
import { looksLikeMermaid } from "./markdown-code-utils";
import { MarkdownCodeBlock } from "./markdown-code-block";
import { MarkdownMermaidBlock } from "./markdown-mermaid-block";
import { parseLanguage } from "./markdown-utils";
import { markdownStyles } from "./markdown-styles";

type MarkdownPreMode = "pending" | "code" | "mermaid";

type MarkdownPreProps = JSX.HTMLAttributes<HTMLPreElement> & {
  children?: JSX.Element;
};

export function MarkdownPre(preProps: MarkdownPreProps) {
  const [local, rest] = splitProps(preProps, ["children", "class"]);
  const [state, setState] = createStore({
    codeLanguage: "text",
    codeText: "",
    isHydrated: false,
    mode: "pending" as MarkdownPreMode,
  });
  let preRef: HTMLPreElement | undefined;

  onMount(() => {
    if (!preRef) {
      setState("isHydrated", true);
      return;
    }

    const codeElement = preRef.querySelector("code");
    const explicitLanguage = codeElement?.getAttribute("data-md-language");
    const language =
      explicitLanguage && explicitLanguage.trim().length > 0
        ? explicitLanguage
        : parseLanguage(codeElement?.className, preRef.className);
    const rawText =
      codeElement?.getAttribute("data-md-raw") ?? preRef.textContent ?? "";
    const nextMode =
      language === "mermaid" || looksLikeMermaid(rawText) ? "mermaid" : "code";

    console.log("MarkdownPre:detectedMode", {
      language,
      nextMode,
      textLength: rawText.length,
    });
    setState({
      codeLanguage: language,
      codeText: rawText.replace(/\r?\n$/, ""),
      isHydrated: true,
      mode: nextMode,
    });
  });

  return (
    <div class={markdownStyles.preWrapper}>
      <Switch>
        <Match when={state.mode === "pending"}>
          <pre class={markdownStyles.pre} {...rest} ref={preRef}>
            {local.children}
          </pre>
        </Match>
        <Match when={state.mode === "code"}>
          <MarkdownCodeBlock
            {...rest}
            codeLanguage={state.codeLanguage}
            codeText={state.codeText}
            isHydrated={state.isHydrated}
          >
            {local.children}
          </MarkdownCodeBlock>
        </Match>
        <Match when={state.mode === "mermaid"}>
          <MarkdownMermaidBlock
            {...rest}
            codeText={state.codeText}
            isHydrated={state.isHydrated}
          >
            {local.children}
          </MarkdownMermaidBlock>
        </Match>
      </Switch>
    </div>
  );
}
