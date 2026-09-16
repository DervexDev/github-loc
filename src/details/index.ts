import { createElement, render } from "preact"
import { App } from "./App"
import "./index.css"

const params = new URLSearchParams(window.location.search)

render(
  createElement(App, {
    org: params.get("org") ?? "",
    repo: params.get("repo") ?? "",
    branch: params.get("branch") ?? "",
  }),
  document.getElementById("app") as HTMLElement,
)
