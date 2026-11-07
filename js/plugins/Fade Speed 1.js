(function() {

    var _Scene_Base_fadeSpeed = Scene_Base.prototype.fadeSpeed;

    Scene_Base.prototype.fadeSpeed = function() {

        if (SceneManager._scene instanceof Scene_Battle) {
            return 1;
        }

        return _Scene_Base_fadeSpeed.call(this);
    };

})();