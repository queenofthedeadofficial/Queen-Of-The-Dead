/*:
 * @plugindesc Forces dialogue boxes to use AAAAA.png as the face.
 * @author
 */

(function() {

"use strict";

const FACE_FILE = "AAAAA";
const FACE_INDEX = 0;

/* Override the face drawn in dialogue boxes */
Window_Message.prototype.drawMessageFace = function() {
    this.drawFace(FACE_FILE, FACE_INDEX, 0, 0);
};

})();