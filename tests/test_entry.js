/*
Bundle up the specs into one large compile unit.
 */

window.debug = {};

const testsContext = require.context(".", true, /.spec.ts/);

testsContext.keys().forEach(testsContext);