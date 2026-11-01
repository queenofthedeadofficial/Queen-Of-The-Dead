//=============================================================================
// Andrew_BlackAndWhiteKnockoutFaces.js
//=============================================================================

/*:
 * @plugindesc v4.00 Makes YEP Battle Status Window faces black and white while State 1 is active.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Black And White Knockout Faces
 * ============================================================================
 *
 * Actors with State 1 have their battle-status face displayed in black and
 * white.
 *
 * Removing State 1 restores the normal colored face.
 *
 * Designed specifically for YEP_BattleStatusWindow.
 *
 * IMPORTANT:
 * Place this plugin BELOW YEP_BattleStatusWindow.js.
 *
 * State ID:
 *   1
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //=========================================================================
    // Grayscale face cache
    //=========================================================================

    var grayscaleCache = {};

    function getGrayscaleFace(faceName) {

        if (grayscaleCache[faceName]) {
            return grayscaleCache[faceName];
        }

        var source = ImageManager.loadFace(faceName);

        if (!source.isReady()) {
            return null;
        }

        if (!source.width || !source.height) {
            return null;
        }

        var gray = new Bitmap(
            source.width,
            source.height
        );

        gray.blt(
            source,
            0,
            0,
            source.width,
            source.height,
            0,
            0,
            source.width,
            source.height
        );

        gray._setDirty();

        var context = gray.context;
        var imageData;

        try {

            imageData = context.getImageData(
                0,
                0,
                gray.width,
                gray.height
            );

        } catch (e) {

            return null;
        }

        var data = imageData.data;

        for (var i = 0; i < data.length; i += 4) {

            if (data[i + 3] === 0) {
                continue;
            }

            var value = Math.round(
                data[i]     * 0.299 +
                data[i + 1] * 0.587 +
                data[i + 2] * 0.114
            );

            data[i]     = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        context.putImageData(
            imageData,
            0,
            0
        );

        gray._setDirty();

        grayscaleCache[faceName] = gray;

        return gray;
    }


    //=========================================================================
    // Draw grayscale face onto YEP's actual face bitmap
    //=========================================================================

    function drawGrayscaleFace(window, actor, index) {

        // YEP Battle Status Window uses a separate bitmap for faces.
        if (!window._faceContents) {
            return;
        }

        var faceBitmap =
            window._faceContents.bitmap;

        if (!faceBitmap) {
            return;
        }

        var gray =
            getGrayscaleFace(actor.faceName());

        if (!gray) {
            return;
        }

        var rect =
            window.itemRect(index);

        var pw =
            Window_Base._faceWidth;

        var ph =
            Window_Base._faceHeight;

        var ww =
            Math.min(
                rect.width - 8,
                pw
            );

        var wh =
            Math.min(
                rect.height - 8,
                ph
            );

        var wx =
            rect.x +
            rect.width -
            ww -
            6;

        var wy =
            rect.y + 4;

        var sx =
            actor.faceIndex() % 4 * pw +
            (pw - ww) / 2;

        var sy =
            Math.floor(actor.faceIndex() / 4) * ph +
            (ph - wh) / 2;

        faceBitmap.blt(
            gray,
            sx,
            sy,
            ww,
            wh,
            wx,
            wy,
            ww,
            wh
        );

        faceBitmap._setDirty();
    }


    //=========================================================================
    // Hook YEP drawStatusFace
    //=========================================================================

    if (typeof Window_BattleStatus !== 'undefined' &&
        Window_BattleStatus.prototype.drawStatusFace) {

        var _drawStatusFace =
            Window_BattleStatus.prototype.drawStatusFace;

        Window_BattleStatus.prototype.drawStatusFace =
            function(index) {

                var actor =
                    $gameParty.battleMembers()[index];

                if (!actor) {
                    return;
                }

                // Let YEP perform its normal drawing first.
                _drawStatusFace.call(
                    this,
                    index
                );

                // Replace the face with grayscale if State 1 is active.
                if (actor.isStateAffected(1)) {

                    drawGrayscaleFace(
                        this,
                        actor,
                        index
                    );
                }
            };
    }

})();