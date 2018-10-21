const database   = require("../middleware/database"),
      errorCodes = require("../core/errorCodes"),
      utilities  = require("../core/utilities"),
      password   = require("./password");

/**
 * Default user model
 * @type {{userid: number, email: string, password: string, salt_id: string, username: string, display_name: string, created: number, verified: boolean, translator: boolean, gold: boolean, profile_picture: null, profile_header: null, description: string, level: number, experience: number, badges: object, title: *, email_verified: boolean, deleted: boolean, two_factor: null, posts: number, likes: number, rockies: number, my_rockies: number}}
 * @private
 */
const _userModel = {
    userid: -1,
    email: "",
    password: "",
    salt_id: "",
    username: "",
    display_name: "",
    created: Date.now(),
    email_verified: true,
    deleted: false,
};

const _publicUserModel = ["userid","username","display_name","created","verified","translator","gold","profile_picture","profile_header","description","level","experience","badges","title","posts","likes","rockies","my_rockies"];

/**
 * Get userData by userid
 * @param {Number,String} userid
 * @param {Object=} trimArray
 * @param {Boolean=false} _convertUserData
 * @returns {Promise<Object>}
 */
function getUserByUserid(userid,trimArray,_convertUserData=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("account",{userid:parseInt(userid)},(error,userData)=>{
            if(error) return reject(errorCodes.USER_NOT_EXISTS);
            if(typeof trimArray !== "undefined") userData = utilities.trimArray(userData,trimArray);
            if(_convertUserData) convertUserData(userData).then(resolve);
            else return resolve(userData);
        });
    });
}

/**
 * Get userData by username
 * @param {String} username
 * @param {Object=} trimArray
 * @param {Boolean=false} _convertUserData
 * @returns {Promise<Object>}
 */
function getUserByUsername(username,trimArray,_convertUserData=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("account",{username:new RegExp(username,"i")},(error,userData)=>{
            if(error) return reject(errorCodes.USER_NOT_EXISTS);
            if(typeof trimArray !== "undefined") userData = utilities.trimArray(userData,trimArray);
            if(_convertUserData) convertUserData(userData).then(resolve);
            else return resolve(userData);
        });
    });
}

/**
 * Get userData by email
 * @param {String} email
 * @param {Object=} trimArray
 * @param {Boolean=false} _convertUserData
 * @returns {Promise<Object>}
 */
function getUserByEmail(email,trimArray,_convertUserData=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("account",{email:new RegExp(email,"i")},(error,userData)=>{
            if(error) return reject(errorCodes.USER_NOT_EXISTS);
            if(typeof trimArray !== "undefined") userData = utilities.trimArray(userData,trimArray);
            if(_convertUserData) convertUserData(userData).then(resolve);
            else return resolve(userData);
        });
    });
}

/**
 * Appending badges, titles to userData
 * @param userData {Object}
 * @returns {Promise<Object>}
 */
function convertUserData(userData) {
    return Promise.resolve(userData);
}

/**
 *
 * @param {String} _key - username or email
 * @param {String} _password
 * @returns {Promise<>}
 */
function loginUser(_key, _password) {
    return new Promise((resolve,reject)=>{
        const isUsername = !validateEmailFormat(_key);

        let userData;

        (isUsername?verifyUsername(_key):verifyEmail(_key))
            .then((_userData)=>{ userData = _userData; return password.getSalt(userData.salt_id,database); })
            .then((salt)=>password.verifyPassword(_password,salt,userData.password))
            .then(()=>resolve(getPublicUserModel(userData)))
            .catch(reject);
    });
}

/**
 * Creating another user with all procedures
 * @param {String} _email
 * @param {String} _password
 * @param {String} username
 * @param {String=} displayName - if undefined using username instead
 * @returns {Promise<Object>}
 */
function registerUser(_email, _password, username, displayName) {
    return new Promise((resolve,reject)=>{

        if(typeof displayName === "undefined") displayName = username;
        else if(!validateDisplayNameFormat(displayName)) return reject(errorCodes.DISPLAY_NAME_INVALID);

        let email, salt, hash, userid, saltID, userModel;

        validateEmail(_email)
            .then((validatedEmail)=>{ email = validatedEmail; return checkIsUsernameFree(username); })
            .then(()=>validatePassword(_password))
            .then(()=>password.generateSalt(true))
            .then((_salt)=>{ salt = _salt; return password.encryptPassword(_password,_salt); })
            .then((items)=>{ hash = items[0]; salt = items[1]; return generateUserid(); })
            .then((_userid)=>{ userid = _userid; return password.storeSalt(salt,database); })
            .then((_saltID)=>{ saltID = _saltID; return createUserModel(userid, email,username,displayName,hash,saltID); })
            .then((_userModel)=>{ userModel = _userModel; return storeUser(_userModel); })
            .then(()=>{ return resolve(getPublicUserModel(userModel)); })
            .catch(reject);
    });
}

/**
 * Checking for used oder reserved username
 * @param {String} _username
 * @param {Boolean} checkReservation
 * @returns {Promise<String>}
 */
function checkIsUsernameFree(_username,checkReservation=true) {
    let username = _username.toLowerCase().replace("@","");
    return new Promise((resolve,reject)=>{
        if(!validateUsernameFormat(username)) return reject(errorCodes.USERNAME_INVALID);
        database.count("account",{username:new RegExp(username,"i")},(_,count)=>{
            if(count>0) return reject(errorCodes.USERNAME_IN_USE);
            if(checkReservation)
                database.count("reservations",{username:new RegExp(username,"i")},(_,count)=>{
                    if(count>0) return reject(errorCodes.USERNAME_RESERVED);
                    return resolve(username);
                });
            else return resolve(username);
        });
    });
}

/**
 * Verifying existing username
 * @param {String} _username
 */
function verifyUsername(_username) {
    let username = _username.toLowerCase().replace("@","");
    return new Promise((resolve,reject)=>{
        database.findOne("account",{username:new RegExp(username,"i")},(error,user)=>{
            if(!error) return resolve(user);
            return reject(errorCodes.USERNAME_NOT_EXISTS);
        });
    });
}

/**
 * Validating display name matching format (1 - 32 chars)
 * @param {String} displayName
 * @returns {Boolean}
 */
function validateDisplayNameFormat(displayName) {
    return /^.{1,32}$/.test(displayName);
}

/**
 * Validating username matching format (3 - 16 chars, a-z, A-Z, 0-9, _)
 * @param {String} username
 * @returns {Boolean}
 */
function validateUsernameFormat(username) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

/**
 * Checking pre encrypted password for validity
 * @param {String} password
 * @returns {Boolean}
 */
function validatePasswordFormat(password) {
    return /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(password);
}

/**
 * Validating email matching format (prefix, @, domain)
 * @param {String} email
 * @returns {Boolean}
 */
function validateEmailFormat(email) {
    return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
}

/**
 * Validating password matching format
 * Replacing googlemail with gemail and lower case
 * @param {String} _email
 * @returns {Promise<>}
 */
function validateEmail(_email) {
    const email = _email.toLowerCase().replace("googlemail","gmail");
    return new Promise((resolve,reject)=>{
        if(!validateEmailFormat(email)) return reject(errorCodes.EMAIL_INVALID);
        database.count("account",{email:email},(_,count)=>{
            if(count>0) return reject(errorCodes.EMAIL_IN_USE);
            return resolve(email);
        });
    });
}

/**
 * Validating password matching format
 * @param {String} password
 * @returns {Promise<>}
 */
function validatePassword(password) {
    if(!validatePasswordFormat(password)) return Promise.reject(errorCodes.PASSWORD_INVALID);
    return Promise.resolve();
}

/**
 * Generating userid
 * @returns {Promise<Number>}
 */
function generateUserid() {
    return new Promise((resolve)=>{
        generateUseridInner((userid)=>{
            resolve(userid);
        });
    });
}

/**
 * Generating unused userid
 * @param callback
 */
function generateUseridInner(callback) {
    const userid = utilities.generateKey(16,true);
    if(userid<Math.pow(10,15)) return generateUseridInner(callback);
    database.count("account",{userid:userid},(_,count)=>{
        if(count>0) return generateUseridInner(callback);
        return callback(userid);
    });
}

/**
 * Creating the user model by filling up values
 * @param {Number} userid
 * @param {String} email
 * @param {String} username
 * @param {String} displayName
 * @param {String} password
 * @param {String} saltID
 * @returns {Promise<Object>}
 */
function createUserModel(userid, email, username, displayName, password, saltID) {
    return new Promise((resolve)=>{
        const userModel = utilities.copyArray(_userModel);
        userModel.userid = userid;
        userModel.email = email;
        userModel.password = password;
        userModel.salt_id = saltID;
        userModel.username = username.toLowerCase();
        userModel.display_name = displayName;
        userModel.created = Date.now();

        resolve(userModel);
    });
}

/**
 * Storing the user inside the account collection
 * @param {Object} userModel
 */
function storeUser(userModel) {
    return new Promise((resolve,reject)=>{
        database.insertOne("account",userModel,(error)=>{
            if(error) return reject(errorCodes.STORE_USER_ERROR);
            return resolve(userModel);
        });
    });
}

/**
 * Returning the user model without sensitive data (seedID, password, ...)
 * @param {Object} userModel
 */
function getPublicUserModel(userModel) {
    return utilities.trimArray(userModel,_publicUserModel);
}

/**
 * Updating user password
 * @param {Number} userid
 * @param {String} newPassword
 * @param {String=} _oldPassword
 * @returns {Promise<>}
 */
function updatePassword(userid,newPassword, _oldPassword) {
    return new Promise((resolve,reject)=>{

        let userData, hash, salt;
        const compareOldPassword = typeof _oldPassword !== "undefined";
        if(compareOldPassword && newPassword===_oldPassword) return reject(errorCodes.NEW_PASSWORD_MATCHES);

        getUserByUserid(userid)
            .then((_userData)=>{ userData = _userData; return compareOldPassword?password.getSalt(userData.salt_id,database):undefined; })
            .then((salt)=>{return compareOldPassword?password.verifyPassword(_oldPassword,salt,userData.password):undefined; })
            .then(()=>validatePassword(newPassword))
            .then(()=>password.generateSalt(true))
            .then((_salt)=>{ salt = _salt; return password.encryptPassword(newPassword,_salt); })
            .then((items)=>{ hash = items[0]; salt = items[1]; return password.storeSalt(salt,database); })
            .then((saltID)=>{
                database.update("account",{userid:userid},{$set:{password:hash,salt_id:saltID}},(error)=>{
                    if(error) return reject(errorCodes.UPDATE_PASSWORD_FAILED);
                    return resolve();
                });
            }).catch(reject);
    });
}

/**
 * Returning users from userid-object
 * @param input {Object}
 * @param trimArray [Object} - Required objects from each user
 * @param _covertUserData {Boolean=false} - Converting user data (badges, titles)
 * @returns {Promise<Object>}
 */
function getUsersByUserid(input,trimArray,_covertUserData=false) {
    getUsersInner(input,true,(users)=>{
        return Promise.resolve(users);
    },trimArray,_covertUserData);
}

/**
 * Returning users from username-object
 * @param input {Object}
 * @param trimArray [Object} - Required objects from each user
 * @param _covertUserData {Boolean=false} - Converting user data (badges, titles)
 * @returns {Promise<Object>}
 */
function getUsersByUsername(input,trimArray,_covertUserData=false) {
    return new Promise((resolve)=>{
        getUsersInner(input,false,(users)=>{
            return resolve(users);
        },trimArray,_covertUserData);
    });
}

/**
 * Inner user receiver for multiple users
 * @param input {Object}
 * @param isID [Boolean}
 * @param callback [Function}
 * @param trimArray [Boolean}
 * @param _convertUserData [Boolean=false} - Converting user data (badges, titles}
 * @param output [Object=[]}
 * @param userCache [Object={}}
 * @returns {*}
 */
function getUsersInner(input,isID,callback,trimArray,_convertUserData=false,output=[],userCache={}) {
    if(input.length===0) return callback(output);
    let key = isID?input[0]:input[0].toLowerCase();
    if(typeof userCache[key] !== "undefined") {
        if(userCache[key] !== null) output.push(userCache[key]);
        input.splice(0,1);
        return getUsersInner(input,isID,callback,trimArray,_convertUserData,output,userCache);
    } else {
        (isID?getUserByUserid(key,trimArray,_convertUserData):getUserByUsername(key,trimArray,_convertUserData))
            .then((user)=>{
                userCache[key] = user;
                output.push(user);
                input.splice(0,1);
                return getUsersInner(input,isID,callback,trimArray,_convertUserData,output,userCache);
            }).catch(()=>{
                userCache[key] = null;
                input.splice(0,1);
                return getUsersInner(input,isID,callback,trimArray,_convertUserData,output,userCache);
            });
    }
}

/**
 * Updating Ambiento-Settings with keys type, enabled and brightness
 * @param userid {String|Number}
 * @param data {Object}
 * @returns {Promise<>}
 */
function updateAmbientoSettings(userid,data) {
    return new Promise((resolve,reject)=>{
        getUserByUserid(userid)
            .then(()=>{
                let toUpdate = {};
                if(typeof data.type !== "undefined")
                    switch (toUpdate) {
                        case "permanent":
                            toUpdate.lightType = "permanent";
                            break;
                        case "blinking":
                            toUpdate.lightType = "blinking";
                            break;
                        case "rainbow":
                            toUpdate.lightType = "rainbow";
                            break;
                        default:
                            toUpdate.lightType = "permanent";
                            break;
                    }
                if(typeof data.enabled !== "undefined") toUpdate.enabled = data.enabled.toString() === "true";
                if(typeof data.brightness !== "undefined") {
                    toUpdate.brightness = data.brightness;
                    if(toUpdate.brightness<0) toUpdate.brightness = 0;
                    else if(toUpdate.brightness>1) toUpdate.brightness = 1;
                }
                database.update("account",{userid:userid},{$set:toUpdate},(error)=>error?reject(errorCodes.ERROR):resolve());
            }).catch(reject);
    });
}

/**
 * Returning Ambiento-Settings from user
 * @param userid {Number|String}
 * @returns {Promise<>}
 */
function getAmbientoSettings(userid) {
    return new Promise((resolve,reject)=>{
        getUserByUserid(userid,["lightType","enabled","brightness"])
            .then((userData)=>{
                let result = {
                    type: "permanent",
                    enabled: true,
                    brightness: 1.0
                };

                if(typeof userData.lightType !== "undefined" && userData.lightType !== null) result.type = userData.lightType;
                if(typeof userData.enabled !== "undefined" && userData.enabled !== null) result.enabled = userData.enabled;
                if(typeof userData.brightness !== "undefined" && userData.brightness !== null) result.brightness = userData.brightness;

                return resolve(result);
            }).catch(reject);
    });
}

module.exports = {
    loginUser                     : loginUser,
    registerUser                  : registerUser,
    updatePassword                : updatePassword,
    publicUserModel               : _publicUserModel,
    getUserByUserid               : getUserByUserid,
    getUserByUsername             : getUserByUsername,
    getUserByEmail                : getUserByEmail,
    getPublicUserModel            : getPublicUserModel,
    convertUserData               : convertUserData,
    getUsersByUserid              : getUsersByUserid,
    getUsersByUsername            : getUsersByUsername,
    getAmbientoSettings           : getAmbientoSettings,
    updateAmbientoSettings        : updateAmbientoSettings
};