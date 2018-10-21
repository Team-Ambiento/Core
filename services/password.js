const errorCodes = require("../core/errorCodes"),
      utilities  = require("../core/utilities"),
      crypto     = require("crypto");

/**
 * Generating salt for password hashing
 * @param {Boolean=false} asPromise
 * @returns {*}
 */
function generateSalt(asPromise=false) {
    if(asPromise)
        return new Promise((resolve)=>{resolve(crypto.randomBytes(128).toString("base64"))});
    return crypto.randomBytes(128).toString('base64');
}

/**
 * Encrypting password with password and salt
 * @param {String} password
 * @param {String} salt
 * @returns {Promise<Object>}
 */
function encryptPassword(password,salt) {
    return new Promise((resolve,reject)=>{
        crypto.pbkdf2(password,salt,32,256,"sha512",(error,hash)=>{
            if(error) reject(errorCodes.ERROR);
            return resolve([hash.toString("base64"),salt]);
        });
    });
}

/**
 * Verify password using comparable, salt and original hash
 * @param {String} password
 * @param {String} salt
 * @param {String} hash
 * @returns {Promise<>}
 */
function verifyPassword(password,salt,hash) {
    return new Promise((resolve,reject)=>{
        encryptPassword(password,salt)
            .then((newHash)=>{
                if(newHash[0].toString('base64')===hash) return resolve();
                return reject(errorCodes.ERROR);
            }).catch(reject);
    });
}

/**
 * Storing salt in database with generated ID
 * @param {String} salt
 * @param {Object} database
 * @returns {Promise<String>}
 */
function storeSalt(salt, database) {
    return new Promise((resolve,reject)=>{
        if(typeof database === "undefined") return reject(errorCodes.ERROR);
        generateSaltID((saltID)=>{
            database.insertOne("salt",{salt_id:saltID,salt:salt},(error)=>{
                if(error) return reject(errorCodes.ERROR);
                return resolve(saltID);
            });
        },database);
    });
}

/**
 * Generating unique salt-id
 * @param {Function} callback
 * @param {Object} database
 */
function generateSaltID(callback,database) {
    const saltID = utilities.generateKey(16);
    database.count("salt",{salt_id: saltID},(_,count)=>{
        if(count>0) return generateSaltID(callback,database);
        return callback(saltID);
    })
}

/**
 * Returning salt from given salt-id
 * @param {String} saltID
 * @param {Object} database
 * @returns {Promise<String>}
 */
function getSalt(saltID, database) {
    return new Promise((resolve,reject)=>{
        if(typeof database === "undefined") return reject(errorCodes.ERROR);
        database.findOne("salt",{salt_id:saltID},(error,saltData)=>{
            if(error) return reject(error.ERROR);
            return resolve(saltData.salt);
        });
    });
}

module.exports = {
    generateSalt    : generateSalt,
    encryptPassword : encryptPassword,
    verifyPassword  : verifyPassword,
    storeSalt       : storeSalt,
    getSalt         : getSalt
};