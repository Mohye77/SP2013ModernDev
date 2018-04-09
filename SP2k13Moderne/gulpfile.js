var gulp = require('gulp');
var gulpLoadPlugins = require('gulp-load-plugins');

var plugins = gulpLoadPlugins();

var path = require('path');
var runSequence = require('run-sequence');

var requireClean = require('require-clean');

var browserSync = require('browser-sync').create();
var browserSyncConf = require('./browsersync.json');

var assetsDir = './assets/';

// Directories
var dir = {
	masters: assetsDir + 'masterpages/',
	layouts: assetsDir + 'layouts/',
	webparts: 'ControlTemplates/IFS/',

	img: assetsDir + 'images/',

	sass: assetsDir + 'src/sass/',
	css: assetsDir + 'dist/css/',

	jsSrc: assetsDir + 'src/js/',
	jsDist: assetsDir + 'dist/js/',

	jsSrcPlugins: assetsDir + 'src/js/plugins/',
	jsDistLib: assetsDir + 'dist/js/lib/',

	fonts: assetsDir + 'dist/fonts/',
	svg: assetsDir + 'src/svg/',
	svgOriginals: assetsDir + 'src/svg/originals/'
};




// Files
var files = {
	masters: dir.masters + '*.master',

	layouts: dir.layouts + '*.aspx',

	webparts: dir.webparts + '*.ascx',

	img: dir.img + '**/*',

	sass: dir.sass + '**/*.scss',
	sassCompile: dir.sass + 'compile.scss'

	css: dir.css + '*.css',
	cssCompile: dir.css + 'compile.css',

	ts: dir.jsSrc + '*.ts',
	tsMain: dir.jsSrc + 'main.ts',

	jsDist: dir.jsDist + '*.js',
	jsDistLib: dir.jsDistLib + '*.js',
	jsDistMain: dir.jsDist + 'main.js',
	jsDistPlugins: dir.jsDist + 'jquery.plugins*.js',

	svgIcons: dir.svg + '*.svg',
	svgOriginalIcons: dir.svgOriginals + '*.svg',
	fonts: dir.fonts + '*.{ttf,otf,svg,woff,woff2,eot}',

	jsFilesConfig: './jsfiles.json'
};



// minifyCSS config
var minCSSConfig = {
	compatibility: 'ie9,' +
		'-units.ch,' +
		'-units.in,' +
		'-units.pc,' +
		'-units.pt,'
}


// Config files
var gulpConf = require('./gulpconfig.json');
var jsFilesConfig = require(files.jsFilesConfig);


var bsReload = function (file) {
	return browserSync.reload();
	if (file.contents > 0) {
		console.log("file not empty : refresh");
	}
	else{
		console.log("file empty : no refresh");
	}
}

var bsStream = function () {
	return browserSync.stream();
}

/**
 * Task : default
 * 		- BrowserSync
 *******************************************/
gulp.task('default', ['browserSync'], function () {});


/**
 * Task : browserSync
 * 		- Synchronize all browsers and devices
 *******************************************/
gulp.task('browserSync', ['sass', 'typescript'], function () {
	browserSync.init(browserSyncConf);

	// JS Config file update
	gulp.watch(files.jsFilesConfig, ['jsFiles']);

	// JS Main file
	gulp.watch(files.ts, ['typescript']);

	// JS auto refresh
	gulp.watch(files.jsDistMain, ['spUploadJSMain']);
	gulp.watch(files.jsDistPlugins, ['spUploadJSPlugins']);
	gulp.watch(files.jsDistLib, ['spUploadJSLib']);

	// SASS Compilation
	gulp.watch(files.sass, ['sass']);
	gulp.watch(files.css, ['spUploadCSS']);

	// Masters auto refresh
	gulp.watch(files.masters, ['spUploadMasterpages']);

	// Layout auto refresh
	gulp.watch(files.layouts, ['spUploadLayouts']);

	gulp.watch(files.webparts, ['spCopyWebparts']);
});

/**
 * Task : package
 *		- Concat JS files
 *		- Concat SASS
 *******************************************/
gulp.task('package', function () {
    runSequence(['jsFiles', 'sass']);
});


/* ==================================================================================== */
/* SASS / CSS TASKS */
/* ==================================================================================== */

/**
 * Task : sass
 * 		- SASS compilation (+ error notification)
 * 		- CSS3 autoprefixing
 * 		- CSS minification
 *******************************************/
gulp.task('sass', function () {
	return gulp
		.src(files.sassCompile)
		.pipe(plugins.plumber({
			errorHandler: plugins.notify.onError({
				title: "Gulp SASS Error",
				message: "<%= error.message %>",
				sound: true
			})
		}))
		.pipe(plugins.sass({
			errLogToConsole: true
		}).on('error', plugins.sass.logError))
		.pipe(plugins.autoprefixer({
			browsers: ['last 2 versions', 'IE 9'],
		}))
		.pipe(gulp.dest(dir.css))
		.pipe(plugins.rename({
			suffix: '.min'
		}))
		.pipe(plugins.cleanCss(minCSSConfig))
		.pipe(gulp.dest(dir.css));
});



/**
 * Task : minCSS
 * 		- All CSS files minification
 *******************************************/
gulp.task('minCSS', function () {
	return gulp
		.src(files.css)
		.pipe(plugins.cleanCss(minCSSConfig))
		.pipe(gulp.dest(dir.css));
});


/* ==================================================================================== */
/* JS TASKS */
/* ==================================================================================== */

/**
 * Task : jsFiles
 * 		- Clean JS files
 *		- Get and move JS libs
 *		- Get and move JS Plugins
 *		- Concat JS Components
 *		- Concat JS Plugins
 *******************************************/
gulp.task('jsFiles', function () {
	runSequence('jsFilesClean', ['jsLibs', 'jsPlugins'], 'jsPluginsCompile', 'typescript');
});



/**
 * Task : jsFilesClean
 * 		- Clean JS files
 *******************************************/
gulp.task('jsFilesClean', function () {
	// Config file without cache
	jsFilesConfig = requireClean(files.jsFilesConfig);

	return gulp
		.src(jsFilesConfig.clean, {
			read: false
		})
		.pipe(plugins.rimraf());
});


/**
 * Task : jsLibs
 *		- Get and move JS libs
 *		- Create a minified version
 *******************************************/
gulp.task('jsLibs', function () {
	return gulp.src(jsFilesConfig.libs)
		.pipe(gulp.dest(dir.jsDistLib))
		.pipe(plugins.rename({
			suffix: '.min'
		}))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dir.jsDistLib));
});


/**
 * Task : jsPlugins
 *		- Get and move JS Plugins
 *		- Create a minified version
 *******************************************/
gulp.task('jsPlugins', function () {
	return gulp.src(jsFilesConfig.plugins)
		.pipe(gulp.dest(dir.jsSrcPlugins))
		.pipe(plugins.rename({
			suffix: '.min'
		}))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dir.jsSrcPlugins));
});


/**
 * Task : jsPluginsCompile
 * 		- Concat JS Plugins
 *		- Create a minified version
 *******************************************/
gulp.task('jsPluginsCompile', function () {
	return gulp
		.src(jsFilesConfig.plugins)
		.pipe(plugins.concat('jquery.plugins.js', {
			newLine: ';\n\n'
		}))
		.pipe(gulp.dest(dir.jsDist))
		.pipe(plugins.rename({
			suffix: '.min'
		}))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dir.jsDist));
});


/**
 * Task : typescript
 * 		- Compile Typescript files
 *******************************************/
gulp.task('typescript', function (cb) {
	var execOptions = {
		continueOnError: false,
		pipeStdout: false,
		customTemplatingThing: "test"
	};
	
	var reporterOptions = {
		err: true,
		stdout: true,
		stderr: true
	};
	
	var cmd = `browserify ${files.tsMain} -p [tsify] > ${files.jsDistMain}`;
	
	return gulp
		.src(files.tsMain)
		.pipe(plugins.exec(cmd, execOptions))
		.pipe(plugins.exec.reporter(reporterOptions))
		.pipe(gulp.src(files.jsDistMain))
		.pipe(plugins.rename({
			suffix: '.min'
		}))
		.pipe(plugins.uglify())
		.pipe(gulp.dest(dir.jsDist));
});



/* ==================================================================================== */
/* SHAREPOINT UPLOAD TASKS */
/* ==================================================================================== */

/**
 * Task : spUploadAll
 * 		- Upload All files to SharePoint
 *******************************************/
gulp.task('spUploadAll', ['spUploadCSS', 'spUploadJS', 'spUploadMasterpages', 'spUploadLayouts', 'spUploadFonts', 'spCopyWebparts'], function () {});

/**
 * Task : spUploadCSS
 * 		- Upload CSS files to SharePoint
 *******************************************/
gulp.task('spUploadCSS', function () {
	return gulp.src(files.css)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spStyleLibrary + "/css",
			notification: true,
		}, gulpConf.spCredentials))
		.pipe(browserSync.stream())
});

/**
 * Task : spUploadJS
 * 		- Upload all JSfiles to SharePoint
 *******************************************/
gulp.task('spUploadJS', ['spUploadJSMain', 'spUploadJSPlugins', 'spUploadJSLib'], function () {});

/**
 * Task : spUploadJSMain
 * 		- Upload JS main files to SharePoint
 *******************************************/
gulp.task('spUploadJSMain', function () {
	return gulp.src(files.jsDistMain)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spStyleLibrary + "/js",
			notification: true,
		}, gulpConf.spCredentials))
		.pipe(plugins.fn(bsReload))
});

/**
 * Task : spUploadJSPlugins
 * 		- Upload JS plugins files to SharePoint
 *******************************************/
gulp.task('spUploadJSPlugins', function () {
	return gulp.src(files.jsDistPlugins)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spStyleLibrary + "/js",
			notification: true,
		}, gulpConf.spCredentials))
});


/**
 * Task : spUploadJSLib
 * 		- Upload JS Lib files to SharePoint
 *******************************************/
gulp.task('spUploadJSLib', function () {
	return gulp.src(files.jsDistLib)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spStyleLibrary + "/js/lib",
			notification: true,
		}, gulpConf.spCredentials))
		.pipe(plugins.fn(bsReload))
});


/**
 * Task : spUploadMasterpages
 * 		- Upload master pages files to SharePoint
 *******************************************/
gulp.task('spUploadMasterpages', function () {
	return gulp.src(files.masters)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spTemplates,
			notification: true,
			checkin: true,
			checkinType: 1
		}, gulpConf.spCredentials))
		.pipe(plugins.fn(bsReload))
});


/**
 * Task : spUploadLayouts
 * 		- Upload layout files to SharePoint
 *******************************************/
gulp.task('spUploadLayouts', function () {
	return gulp.src(files.layouts)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spTemplates,
			notification: true,
			checkin: true,
			checkinType: 1
		}, gulpConf.spCredentials))
		.pipe(plugins.fn(bsReload))
});


/**
 * Task : spUploadFonts
 * 		- Upload all fonts files to SharePoint
 *******************************************/
gulp.task('spUploadFonts', function () {
	return gulp.src(files.fonts)
		.pipe(plugins.spsave({
			siteUrl: gulpConf.spPortalUrl,
			folder: gulpConf.spStyleLibrary + "/fonts",
			notification: true,
		}, gulpConf.spCredentials))
		.pipe(plugins.fn(bsReload))
});

/**
 * Task : spCopyWebparts
 * 		- Copy webparts files to SharePoint
 *******************************************/
gulp.task('spCopyWebparts', function () {
	return gulp.src(files.webparts)
		.pipe(plugins.injectString.replace("\\$SharePoint.Project.AssemblyFullName\\$", gulpConf.spAssemblyName))
		.pipe(gulp.dest(gulpConf.spWebpartsPath))
		.pipe(plugins.fn(bsReload))
});