/**
 * Generating random key
 * @param {Number=8} length
 * @param {Boolean=false} onlyNumeric - If true, checking for results below length for regeneration
 * @returns {Object}
 */
function generateKey(length=8,onlyNumeric=false) {
    let text = "";
    const possible = onlyNumeric?"012345678":"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(let i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    if(onlyNumeric && parseInt(text).toString().length<length) return generateKey(length,onlyNumeric);

    return onlyNumeric?parseInt(text):text;
}

/**
 * Copying array
 * @param {Object} array
 * @returns {Object}
 */
function copyArray(array) {
    return JSON.parse(JSON.stringify(array));
}

/**
 * Reducing array to needed values
 * @param {Object} _array
 * @param {Object} needed
 * @param {Boolean=true} createCopy
 * @returns {*}
 */
function trimArray(_array, needed,createCopy=true) {
    const array = createCopy?copyArray(_array):_array;
    for (let item in array)
        if (needed.indexOf(item) === -1) {
            delete array[item];
        }
    return array;
}

/**
 * Checking for any missing key inside toFind-Array
 * @param {Object} array
 * @param {Object} toFind
 * @returns {boolean}
 */
function isKeyMissing(array,toFind) {
    let missing = false;
    toFind.forEach(function(find) {
        if(typeof array[find] === "undefined") missing = true;
    });
    return missing;
}

/**
 * Returning value of array, if undefined returning default value
 * @param {Object} array
 * @param {Object} key
 * @param {*} defaultValue
 * @returns {*}
 */
function getValue(array ,key, defaultValue) {
    if(typeof array[key] === "undefined") return defaultValue;
    return array[key];
}

/**
 * Returning boolean value of array, if undefined returning false
 * @param {Object} array
 * @param {Object} key
 * @returns {*}
 */
function getBooleanValue(array ,key) {
    if(typeof array[key] === "undefined") return false;
    return array[key].toString()==="true";
}

/**
 * Fill array with values from another array
 * @param {Object} _toFill
 * @param {Object} fillFrom
 * @param {Boolean=false} _copyArray
 * @returns {Object}
 */
function fillArray(_toFill,fillFrom,_copyArray=false) {
    const toFill = _copyArray?copyArray(_toFill):_toFill;
    Object.keys(toFill).forEach((key)=>{
        if(typeof fillFrom[key] !== "undefined") toFill[key] = fillFrom[key];
    });
    return toFill;
}

/**
 * Combine two arrays with values from second array
 * @param {Object} _array1
 * @param {Object} array2
 * @param {Boolean=false} _copyArray
 * @returns {Object}
 */
function combineArrays(_array1,array2,_copyArray=false) {
    const array1 = _copyArray?copyArray(_array1):_array1;
    Object.keys(array2).forEach((key)=>{
        array1[key] = array2[key];
    });
    return array1;
}

/**
 * Check if char code matches one of given possibilities
 * @param charCode
 * @param possibilities
 * @returns {boolean}
 */
function isValidCharCode(charCode,possibilities=[]) {
    let valid = false;
    possibilities.forEach((possibility)=>{
        if(charCode===possibility) valid = true;
    });
    return valid;
}

/**
 * Adding possibly missing http prefix
 * @param text
 * @returns {*}
 */
function prettyURL(text) {
    if(text.startsWith("http://") || text.startsWith("https://")) return text;
    return "http://"+text;
}

function dropKeys(_array1,array2,_copyArrays=false) {
    let array1 = _copyArrays?copyArray(_array1):_array1;
    array2.forEach((key)=>{
        delete array1[key];
    });
    return array1;
}

module.exports = {
    generateKey          : generateKey,
    copyArray            : copyArray,
    combineArrays        : combineArrays,
    trimArray            : trimArray,
    isKeyMissing         : isKeyMissing,
    getValue             : getValue,
    fillArray            : fillArray,
    isValidCharCode      : isValidCharCode,
    prettyURL            : prettyURL,
    dropKeys             : dropKeys,
    getBooleanValue      : getBooleanValue,
};

