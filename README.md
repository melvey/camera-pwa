# HIT238 Project Template
A simple project template to get you started with npm and gulp

## package.json
It is best to generate your own package.json for your project. If you choose to use the one from this repository be sure to update your repository and project details.


## dependencies
You will need the following dependencies to use this gulpfile
* babel
* babel-preset-env
* babelify
* browserify
* gulp@next
* gulp-autoprefixer
* gulp-combine-mq
* gulp-concat
* gulp-if
* gulp-load--plugins
* gulp-sass
* gulp-uglify
* vinyl-buffer
* vinyl-source-stream
* yargs

You can install them with the following command
`npm install --save-dev babel babel-preset-env babelify browserify gulp@next gulp-autoprefixer gulp-combine-mq gulp-concat gulp-if gulp-load--plugins gulp-sass gulp-uglify vinyl-buffer vinyl-source-stream yargs`

If you use the existing script import you will also need the follow to include the fetch pollyfill
* whatwg-fetch

You can install it with
`npm install --save-dev whatwg-fetch`

## Using with github pages
You can show just your build output in github pages using a subtree. See [Deploying a subfolder to GitHub Pages](https://gist.github.com/cobyism/4730490). This repository uses a build directory while the linked article uses a dist directory so you will need to replace all instances of dist with build
