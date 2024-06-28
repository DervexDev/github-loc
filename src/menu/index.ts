import { createElement, render } from "preact"
import { Menu } from "./Menu"
import "./index.css"

render(createElement(Menu, null), document.getElementById("app") as HTMLElement)
