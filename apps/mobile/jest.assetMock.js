// jest.assetMock.js — stub for bundled audio/image assets in Jest
// Returns a numeric ID (like Metro's require() does at runtime) so that
// code like `createAudioPlayer(require('./alarm_528.wav'))` works in tests.
module.exports = 1;
