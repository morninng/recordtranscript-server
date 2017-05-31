var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");




gulp.task("build_lib", function () {

    gulp.src('./lib/*.ts')
        .pipe(tsProject())
        .js.pipe(gulp.dest('./lib'))
});

