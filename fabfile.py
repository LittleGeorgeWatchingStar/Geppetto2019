import os
import sys
from os.path import realpath, join, dirname
from datetime import datetime

from fabric.api import env, task, local, execute, warn_only
from fabric.colors import green, red
from fabric.context_managers import quiet
from fabric.contrib.console import confirm

################
# Environments #
################

env.appdir = os.path.dirname(__file__)


#########
# Tasks #
#########

@task
def setup():
    """
    Set up the webapp for serving Geppetto Web.
    """
    execute(node_install)
    local("npm prune")


@task
def cloc():
    """Count lines of code."""
    local("cloc src less templates")


def compile(target, version_number):
    with quiet():
        result = local('git -c color.status=always status -s', capture=True)
    if result.stdout != '':
        print('You have outstanding changes that may get compiled too:')
        print('\n'.join(result.split('\n')))
        if not confirm('Do you want to proceed?', default=False):
            sys.exit(1)
    execute(compile_src, target, version_number)


@task
def compile_src(target, version_number):
    """
    Compile our Typescript/ECMA6 code into ECMA5.

    @param target: Target build: local, devstix, or release.
    @param version_number: Version number for devstix or release builds.
    """
    execute(clean)
    execute(compile_less)
    execute(copy_static)

    with warn_only():
        node('webpack -p --env.target={} --env.release={}'
             .format(target, version_number))


def node(command):
    local('node_modules/.bin/{}'.format(command))


@task
def clean():
    local('rm -rf compiled/*')


@task
def compile_less():
    node('lessc -ru less/themes/default.less compiled/css/themes/default.css')
    node('lessc -ru less/themes/blue.less compiled/css/themes/blue.css')
    node('lessc -ru less/themes/black.less compiled/css/themes/black.css')
    node('lessc -ru less/themes/rpi.less compiled/css/themes/rpi.css')



@task
def copy_static():
    local('cp -r static/* compiled')


def _get_version_number():
    return local('git rev-parse --short HEAD', capture=True).strip().upper()


@task
def show_version():
    """
    Show the current version number.
    """
    print(_get_version_number())


@task
def golive():
    """Publish a new version to production, and optionally make it live."""
    _assert_branch('live')
    version_number = _get_version_number()
    compile('release', version_number)
    _upload('compiled', 's3://geppetto-static/r{}'.format(version_number))
    msg = "Please go to https://geppetto.gumstix.com/r{v} to check that version {v} was published successfully."
    print(msg.format(v=version_number))
    execute(put_live_loader)


def _assert_branch(expected_branch):
    """
    Ensure that we're on the expected Git branch.
    """
    actual = local('git rev-parse --abbrev-ref HEAD', capture=True)
    if expected_branch != actual:
        print(red("On branch {}; need to be on {}.".format(actual, expected_branch)))
        sys.exit(1)


@task
def put_live_loader():
    """Take the current published version live into production."""
    if confirm('This will really go live into production! Are you sure?'):
        _put_loader('geppetto-static', 'compiled/loader.html')
        datestamp = datetime.now().strftime('%Y-%m-%d')
        local('git tag --force release{} HEAD'.format(datestamp))
        local('git push --tags --force')
    else:
        print("Aborting...")


def _put_loader(bucket_name, filename):
    compiled_dir = realpath(join(dirname(__file__), dirname(filename)))
    cmd = 's3put --prefix={dir} --region=us-west-2 --bucket={bucket} {filename}'
    local(cmd.format(dir=compiled_dir, bucket=bucket_name, filename=filename))


@task
def godev():
    """Publish and release a new version to devstix."""
    _assert_branch('master')
    version_number = _get_version_number()
    compile('devstix', version_number)
    _upload('compiled', 's3://dev-geppetto-static/r{}'.format(version_number))
    _put_loader('dev-geppetto-static', 'compiled/loader.html')


@task
def goseeed():
    """Publish and release a new version to neostix (SEEED)."""
    _assert_branch('master')
    version_number = _get_version_number()
    compile('seeed', version_number)
    _upload('compiled', 's3://dev-seeed-geppetto-static/r{}'.format(version_number))
    _put_loader('dev-seeed-geppetto-static', 'compiled/loader.html')


@task
def compile_local():
    """Only do compile"""
    version_number = _get_version_number()
    compile('devstix', version_number)


def _upload(src, dst):
    """
    Upload the contents of `src` to S3.
    """
    local('aws s3 sync {} {}'.format(src, dst))
    print(green("Finished uploading contents of {} to {}.".format(src, dst)))


@task
def run_local():
    """
    Run it locally.
    """
    execute(clean)
    execute(compile_less)
    execute(copy_static)

    node('webpack-dev-server --env.target=local')


@task
def run_tests(continuously='n'):
    """
    Run the testing suite.
    """
    single_run = '--no-single-run' if continuously == 'y' else ''
    node('karma start karma.conf.js {}'.format(single_run))


@task
def merge():
    """
    Merge changes from master branch into live.
    """
    local('git checkout live')
    local('git merge master')
    local('git push origin live master')
    local('git checkout master')


@task
def node_install():
    """
    Install node packages into the lib directory.
    """
    local("npm install")
