import { tags as t } from "@lezer/highlight"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"

const vscodeDarkSettings = {
  background: "#1e1e1e",
  foreground: "#9cdcfe",
  caret: "#c6c6c6",
  selection: "#6199ff2f",
  selectionMatch: "#72a1ff59",
  lineHighlight: "#ffffff0f",
  gutterBackground: "#1e1e1e",
  gutterForeground: "#838383",
  gutterActiveForeground: "#fff",
  fontFamily: 'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
}

const vscodeLightSettings = {
  background: "#ffffff",
  foreground: "#383a42",
  caret: "#000",
  selection: "#add6ff",
  selectionMatch: "#a8ac94",
  lineHighlight: "#99999926",
  gutterBackground: "#fff",
  gutterForeground: "#237893",
  gutterActiveForeground: "#0b216f",
  fontFamily: 'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
}

function buildTheme(settings: Record<string, string | undefined>, dark: boolean, kwColor: string, idColor: string) {
  const themeOptions: Record<string, Record<string, string>> = { ".cm-gutters": {} }
  const baseStyle: Record<string, string> = {}
  if (settings.background) baseStyle.backgroundColor = settings.background
  if (settings.foreground) baseStyle.color = settings.foreground
  if (settings.fontSize) baseStyle.fontSize = settings.fontSize
  if (settings.background || settings.foreground) themeOptions["&"] = baseStyle
  if (settings.fontFamily) themeOptions["&.cm-editor .cm-scroller"] = { fontFamily: settings.fontFamily }
  if (settings.gutterBackground) themeOptions[".cm-gutters"].backgroundColor = settings.gutterBackground
  if (settings.gutterForeground) themeOptions[".cm-gutters"].color = settings.gutterForeground
  if (settings.gutterBorder) themeOptions[".cm-gutters"].borderRightColor = settings.gutterBorder
  if (settings.caret) {
    themeOptions[".cm-content"] = { caretColor: settings.caret }
    themeOptions[".cm-cursor, .cm-dropCursor"] = { borderLeftColor: settings.caret }
  }
  const activeLineGutter: Record<string, string> = {}
  if (settings.gutterActiveForeground) activeLineGutter.color = settings.gutterActiveForeground
  if (settings.lineHighlight) {
    themeOptions[".cm-activeLine"] = { backgroundColor: settings.lineHighlight }
    activeLineGutter.backgroundColor = settings.lineHighlight
  }
  themeOptions[".cm-activeLineGutter"] = activeLineGutter
  if (settings.selection) {
    themeOptions[
      "&.cm-focused .cm-selectionBackground, & .cm-line::selection, & .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection"
    ] = { background: settings.selection + " !important" }
  }
  if (settings.selectionMatch) {
    themeOptions["& .cm-selectionMatch"] = { backgroundColor: settings.selectionMatch }
  }
  const themeExt = EditorView.theme(themeOptions, { dark })

  const highlightStyle = HighlightStyle.define([
    // Parent/base tags first — subtags later override them
    { tag: t.name, color: idColor },
    { tag: t.deleted, color: idColor },
    { tag: t.character, color: idColor },
    { tag: t.macroName, color: idColor },
    { tag: t.propertyName, color: idColor },
    { tag: t.variableName, color: idColor },
    { tag: t.labelName, color: idColor },
    { tag: t.definition(t.name), color: idColor },
    // Keyword & modifier tags (subtags of name) override above
    { tag: t.keyword, color: kwColor },
    { tag: t.operatorKeyword, color: kwColor },
    { tag: t.modifier, color: kwColor },
    { tag: t.color, color: kwColor },
    { tag: t.constant(t.name), color: kwColor },
    { tag: t.standard(t.name), color: kwColor },
    { tag: t.standard(t.tagName), color: kwColor },
    { tag: t.special(t.brace), color: kwColor },
    { tag: t.atom, color: kwColor },
    { tag: t.bool, color: kwColor },
    { tag: t.special(t.variableName), color: kwColor },
    { tag: t.controlKeyword, color: dark ? "#c586c0" : "#af00db" },
    { tag: t.moduleKeyword, color: dark ? "#c586c0" : "#af00db" },
    // Type/class tags (subtags of name)
    { tag: t.typeName, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.className, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.tagName, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.changed, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.annotation, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.self, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.namespace, color: dark ? "#4ec9b0" : "#267f99" },
    { tag: t.number, color: dark ? "#b5cea8" : "#098658" },
    { tag: t.function(t.variableName), color: dark ? "#dcdcaa" : "#795e26" },
    { tag: t.function(t.propertyName), color: dark ? "#dcdcaa" : "#795e26" },
    // Other non-name tags
    { tag: t.heading, fontWeight: "bold", color: dark ? "#9cdcfe" : "#0070c1" },
    { tag: t.operator, color: dark ? "#d4d4d4" : "#383a42" },
    { tag: t.punctuation, color: dark ? "#d4d4d4" : "#383a42" },
    { tag: t.separator, color: dark ? "#d4d4d4" : "#383a42" },
    { tag: t.url, color: dark ? "#d4d4d4" : "#383a42" },
    { tag: t.escape, color: dark ? "#d4d4d4" : "#383a42" },
    { tag: t.regexp, color: dark ? "#d16969" : "#af00db" },
    { tag: t.special(t.string), color: dark ? "#ce9178" : "#a31515" },
    { tag: t.processingInstruction, color: dark ? "#ce9178" : "#a31515" },
    { tag: t.string, color: dark ? "#ce9178" : "#a31515" },
    { tag: t.inserted, color: dark ? "#ce9178" : "#a31515" },
    { tag: t.angleBracket, color: dark ? "#808080" : "#383a42" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.meta, color: dark ? "#6a9955" : "#008000" },
    { tag: t.comment, color: dark ? "#6a9955" : "#008000" },
    { tag: t.link, color: dark ? "#6a9955" : "#4078f2", textDecoration: "underline" },
    { tag: t.invalid, color: dark ? "#ff0000" : "#e45649" },
  ])

  return [themeExt, syntaxHighlighting(highlightStyle)]
}

export const vscodeDark = buildTheme(vscodeDarkSettings, true, "#569cd6", "#6cbf7c")
export const vscodeLight = buildTheme(vscodeLightSettings, false, "#0000ff", "#1a8a5a")
