#!/usr/bin/env node

// forked to run prebuild --all
// see https://github.com/prebuild/prebuild-ci/issues/8

var exec = require('child_process').exec
var spawn = require('cross-spawn')
var npmRunPath = require('npm-run-path-compat')
var log = require('npmlog')
var version = require('./package').version

if (!process.env.CI) process.exit()

log.heading = 'prebuild-ci'
log.level = 'verbose'

var token = process.env.PREBUILD_TOKEN
if (!token) {
  log.error('PREBUILD_TOKEN required')
  process.exit(0)
}

function getPackageVersion (rev, cb) {
  exec('git show ' + rev + ':package.json', {
    encoding: 'utf8'
  }, function (err, diff) {
    cb(err, diff && JSON.parse(diff).version)
  })
}

function prebuild (cb) {
  var ps = spawn('prebuild', [
    '--all',
    '--strip',
    '-u', token,
    '--verbose'
  ], {
    env: npmRunPath.env()
  })
  ps.stdout.pipe(process.stdout)
  ps.stderr.pipe(process.stderr)
  ps.on('exit', function (code) {
    if (code) return cb(Error(), code)
    cb()
  })
}

log.info('begin', 'Prebuild-CI version', version)

getPackageVersion('HEAD', function (err, head) {
  if (err) throw err

  getPackageVersion('HEAD~1', function (err, prev) {
    if (err) throw err
    if (head === prev) {
      log.info('No version bump, exiting')
      process.exit(0)
    }

    prebuild(function (err, code) {
      if (err) process.exit(code)
      log.info('All done!')
      process.exit(code)
    })
  })
})
