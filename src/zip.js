import gulp from "gulp"
import zip from "gulp-zip"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const manifest = require("../package.json")

gulp
  .src(["build/**", "!build/*.png"], { encoding: false })
  .pipe(zip(manifest.name + ".zip"))
  .pipe(gulp.dest("./"))
