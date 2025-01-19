import gulp from "gulp"
import zip from "gulp-zip"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const manifest = require("../build/manifest.json")

gulp
  .src(["build/**", "!build/*.png"], { encoding: false })
  .pipe(zip(manifest.name.replaceAll(" ", "-").toLowerCase() + ".zip"))
  .pipe(gulp.dest("./"))
