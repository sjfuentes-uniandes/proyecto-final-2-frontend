const base = require('./karma.conf.js');
module.exports = function (config) {
  base(config);
  config.set({ browsers: ['ChromeSinSandbox'], customLaunchers: { ChromeSinSandbox: { base: 'ChromeHeadless', flags: ['--no-sandbox'] } } });
};
