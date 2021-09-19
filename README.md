# Setting up a development server #

Clone geppetto-web (this repo) to your local machine.

Download the latest *LTS* version of [Node.js][node] and unpack it to your home
directory.

Include the path to node's **bin** directory in your shell's PATH variable.
For example:

    PATH=$PATH:~/lib/nodejs/bin

Add it to the bottom of your .bashrc file to make the change permanent.
For example:

    export PATH=$PATH:~/lib/nodejs/bin

Run the Fabric **setup** task to install gulp and copy dependencies:

    fab setup

Type `fab -l` to see all available Fabric tasks.

Run the geppetto-web server locally:

    fab run_local

Access geppetto-web by going to [geppetto.mystix.com][mystix]

# Releasing a new version #

## To devstix ##

Ensure you are on the `master` branch, then run:

    fab godev

This will compile and publish the application.

## To production ##

Ensure you are on the `live` branch, then run:

    fab golive

This will compile and upload the latest version of the application,
but it will prompt you to confirm that the correct version has been
uploaded. Follow the instructions on screen to do the final release.


# Running units tests #

Just run:

    fab run_tests

We use [Karma][karma] as our test runner.


[node]: https://nodejs.org/en/download/
[mystix]: http://geppetto.mystix.com
[karma]: https://karma-runner.github.io
