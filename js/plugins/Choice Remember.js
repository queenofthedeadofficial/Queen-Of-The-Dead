(function(module) {
    'use strict';

    var LABEL_INTERPRETER_CODE = 118;
    var Italia2022 = module.Italia2022 || {};

    var isDefined = function(value) {
        return value !== undefined && value !== null;
    };

    var ensureChoiceStorage = function() {
        if (!$gameMap._interpreter._lastIndexByChoiceLabel) {
            $gameMap._interpreter._lastIndexByChoiceLabel = {};
        }
    };

    var getExpectedLabel = function() {
        if (
            !isDefined($gameMap._interpreter) ||
            !isDefined($gameMap._interpreter._list) ||
            !isDefined($gameMap._interpreter._index)
        ) {
            return null;
        }

        var expectedLabel =
            $gameMap._interpreter._list[$gameMap._interpreter._index - 2];

        if (expectedLabel && expectedLabel.code === LABEL_INTERPRETER_CODE) {
            return expectedLabel.parameters[0];
        }

        return null;
    };

    Italia2022.choiceOk = Window_ChoiceList.prototype.callOkHandler;

    Window_ChoiceList.prototype.callOkHandler = function() {
        ensureChoiceStorage();

        var expectedLabel = getExpectedLabel();

        if (expectedLabel) {
            $gameMap._interpreter._lastIndexByChoiceLabel[expectedLabel] =
                this.index();
        }

        Italia2022.choiceOk.call(this);
    };

    Italia2022.choiceDefaultSelect =
        Window_ChoiceList.prototype.selectDefault;

    Window_ChoiceList.prototype.selectDefault = function() {
        ensureChoiceStorage();

        var expectedLabel = getExpectedLabel();

        if (expectedLabel) {
            var lastIndex =
                $gameMap._interpreter._lastIndexByChoiceLabel[expectedLabel];

            if (isDefined(lastIndex)) {
                this.select(lastIndex);
                return;
            }
        }

        Italia2022.choiceDefaultSelect.call(this);
    };

})(window);