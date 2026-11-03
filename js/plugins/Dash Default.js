/*:
 * @plugindesc Enable Always Dash by default
 * @help No plugin commands.
 */
(function() {
  var _ConfigManager_makeData = ConfigManager.makeData;
  ConfigManager.makeData = function() {
    var config = _ConfigManager_makeData.call(this);
    config.alwaysDash = true;
    return config;
  };

  var _ConfigManager_applyData = ConfigManager.applyData;
  ConfigManager.applyData = function(config) {
    if (!config) config = {};
    if (config.alwaysDash === undefined) config.alwaysDash = true;
    _ConfigManager_applyData.call(this, config);
  };
})();
