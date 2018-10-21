const database   = require("../middleware/database"),
      errorCodes = require("../core/errorCodes"),
      config     = require("../config"),
      account    = require("./account"),
      utilities  = require("../core/utilities");

const _applicationModel = Object.freeze({
    application_id: -1,
    title: "",
    description: "",
    website: "",
    callback_url: "",
    user: -1,
    created: Date.now(),
    application_key: "",
    application_secret: "",
    status: 0,
    statistics: {
        authentication_count: 0,
        request_count: 0
    }
});

/**
 * Validating title of application based on length comparision
 * @param title {String}
 * @returns {Promise<>}
 */
function validateTitle(title) {
    return new Promise((resolve,reject)=>{
        if(!(title.length>=4 && title.length<=20 && !title.startsWith(" ") && !title.endsWith(" "))) return reject(errorCodes.APPLICATION_TITLE_INVALID);
        database.findOne("application",{title:{$regex:"^"+title+"$",$options:"i"}},(error)=>{
            if(error) resolve();
            reject(errorCodes.APPLICATION_TITLE_IN_USE);
        },"api");
    });
}

/**
 * Validating description of application based on length comparision
 * @param description {String}
 * @returns {Promise<>}
 */
function validateDescription(description) {
    return (description.length>=4 && description.length<=400 && !description.startsWith(" ") && !description.endsWith(" "))?Promise.resolve():Promise.reject(errorCodes.APPLICATION_DESCRIPTION_INVALID);
}

/**
 * Validating url of application based on existing http / [ prefix
 * @param url {String}
 * @param onError {Object}
 * @returns {Promise<>}
 */
function validateURL(url,onError=errorCodes.URL_INVALID) { //TODO bitte was sinnvolleres für alle Arten von Adressen, subdomains, queries, ...
    return (url.startsWith("http") || urls.startsWith("["))?Promise.resolve():Promise.reject(onError);
}

/**
 * Generating unique ApplicationID
 * @param callback {Function}
 */
function generateApplicationIDInner(callback) {
    let applicationID = utilities.generateKey(16,true);
    database.count("application",{application_id:applicationID},(error,count)=>{
        if(count>0) return generateApplicationIDInner(callback);
        return callback(applicationID);
    },"api");
}

/**
 * Generating unique ApplicationID
 * @returns {Promise<Number>}
 */
function generateApplicationID() {
    return new Promise((resolve)=>generateApplicationIDInner(resolve));
}

/**
 * Generating pair of public key and private key
 * @returns {Promise<*[]>}
 */
function generateApplicationKeyPair() {
    let applicationKey = utilities.generateKey(50);
    let applicationPrivate = utilities.generateKey(50);
    return Promise.resolve([applicationKey,applicationPrivate]);
}

/**
 * Create application for third party services
 * @param userid {Number|String|undefined}
 * @param title {String}
 * @param description {String}
 * @param website {String}
 * @param callbackURL {String}
 * @param _permissions {Object}
 * @returns {Promise<Object>}
 */
function createApplication(userid,title,description,website,callbackURL) {
    return new Promise((resolve,reject)=>{
        let applicationID, applicationKey, applicationPrivate;
        validateTitle(title)
            .then(()=>validateDescription(description))
            .then(()=>generateApplicationID())
            .then((_applicationID)=>{ applicationID = _applicationID;  return generateApplicationKeyPair(); })
            .then((applicationKeyPair)=>{applicationKey = applicationKeyPair[0]; applicationPrivate = applicationKeyPair[1]; return buildStructure(-1,title,description,website,callbackURL,applicationID,applicationKey,applicationPrivate)})
            .then((applicationStructure)=>registerApplication(applicationStructure))
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Building structure of application
 * @param userid {Number}
 * @param title {String}
 * @param description {String}
 * @param website {String}
 * @param callbackURL {String}
 * @param applicationID {Number}
 * @param applicationKey {String}
 * @param applicationPrivate {String}
 * @returns {Promise<Object>}
 */
function buildStructure(userid,title,description,website,callbackURL,applicationID,applicationKey,applicationPrivate) {
    return Promise.resolve(utilities.combineArrays(_applicationModel,{
        application_id: applicationID,
        title: title,
        description: description,
        website: website,
        callback_url: callbackURL,
        user: userid,
        created: Date.now(),
        application_key: applicationKey,
        application_secret: applicationPrivate,
        statistics: {
            authentication_count: 0,
            request_count: 0
        }
    },true));
}

/**
 * Registering application in database
 * @param applicationStructure
 * @returns {Promise<Object>}
 */
function registerApplication(applicationStructure) {
    return new Promise((resolve,reject)=>{
        database.insertOne("application",applicationStructure,(error)=>{
            if(error) return reject(errorCodes.ERROR);
            delete applicationStructure._id;
            return resolve(applicationStructure);
        },"api");
    });
}

/**
 * Returning applications created by user
 * @param userid
 * @param appendUserData
 * @returns {Promise<Object>}
 */
function getUserCreatedApplications(userid,appendUserData=false) {
    return new Promise((resolve,reject)=>{
        database.find("application",{user:userid},(error,applications)=>{
            if(error) return reject(errorCodes.ERROR);
            if(appendUserData) getUserCreatedApplicationsInner(applications,resolve);
            else {
                applications.forEach((application) => {delete application._id});
                resolve(applications);
            }
        },"api");
    });
}

/**
 * Inner method to parse applications with appended user data from user
 * @param input
 * @param callback
 * @param output
 * @returns {*}
 */
function getUserCreatedApplicationsInner(input,callback,output=[]) {
    if(input.length===0) return callback(output);
    getApplication(input[0].application_id,true)
        .then((application)=>{
            input.splice(0,1);
            output.push(application);
            return getUserCreatedApplicationsInner(input,callback,output);
        }).catch(()=>{
            input.splice(0,1);
            return getUserCreatedApplicationsInner(input,callback,output);
        });
}

/**
 * Dropping application and access
 * @param applicationID
 * @returns {Promise<>}
 */
function deleteApplication(applicationID) {
    return new Promise((resolve,reject)=>{
        getApplication(applicationID)
            .then(()=>database.deleteMany("oauth",{application_id:applicationID},()=>database.deleteOne("application",{application_id:applicationID},()=>resolve(),"api"),"api"))
            .catch(reject);
    });
}

/**
 * Updating application keys and dropping oauth access
 * @param applicationID
 * @returns {Promise<Object>}
 */
function updateApplicationKeys(applicationID) {
    return new Promise((resolve,reject)=>{
        let application;
        getApplication(applicationID)
            .then((_application)=>{application=_application;return generateApplicationKeyPair()})
            .then((applicationKeyPair)=>{
                application.application_key = applicationKeyPair[0];
                application.application_secret = applicationKeyPair[1];

                database.deleteMany("oauth",{application_id:applicationID},()=>
                    database.update("application",{application_id:applicationID},{$set:application},(error)=>{
                        if(error) return reject(errorCodes.ERROR);
                        getApplication(applicationID,true).then(resolve).catch(reject);
                    },"api")
                );
            })
    });
}

/**
 * Updating given variables, if permissions updated dropping oauth access
 * @param applicationID
 * @param values
 * @returns {Promise<Object>}
 */
function updateApplication(applicationID,values) {
    return new Promise((resolve,reject)=>{
        let application;
        getApplication(applicationID)
            .then((_application)=>{
                application = _application;
                (typeof values["title"] === "undefined"?Promise.resolve():validateTitle(values["title"]))
                    .then(()=>(typeof values["description"] === "undefined"?Promise.resolve():validateDescription(values["description"])))
                    .then(()=>(typeof values["website"] === "undefined"?Promise.resolve():validateURL(values["website"],errorCodes.APPLICATION_WEBSITE_INVALID)))
                    .then(()=>(typeof values["callback_url"] === "undefined"?Promise.resolve():validateURL(values["callback_url"],errorCodes.APPLICATION_CALLBACK_INVALID)))
                    .then(()=>(typeof values["permissions"] === "undefined"?Promise.resolve():validatePermissions(values["permissions"])))
                    .then((_permissions)=>new Promise((_resolve)=>{
                        if(typeof _permissions !== "undefined") {
                            database.deleteMany("oauth",{application_id:applicationID},()=>{
                                application.permissions = _permissions;
                                return _resolve();
                            },"api");
                        } else return _resolve();
                    }))
                    .then(()=>{
                        application.title = utilities.getValue(values,"title",application.title);
                        application.description = utilities.getValue(values,"description",application.description);
                        application.website = utilities.getValue(values,"website",application.website);
                        application.callback_url = utilities.getValue(values,"callback_url",application.callback_url);

                        database.update("application",{application_id:applicationID},{$set:application},(error)=>{
                            if(error) return reject(errorCodes.ERROR);
                            getApplication(applicationID,true).then(resolve).catch(reject);
                        },"api");
                    })
                    .catch(reject);
            })
    });
}

/**
 * Checking for existing oauth access
 * @param applicationID
 * @param userid
 * @returns {Promise<Object>}
 */
function getApplicationAccess(applicationID, userid) {
    return new Promise((resolve,reject)=>{
        getApplication(applicationID)
            .then((application)=>{
                database.findOne("oauth",{application_id:application.application_id,userid:userid},(error,applicationData)=>{
                    if(error) return reject(errorCodes.APPLICATION_NO_ACCESS);
                    return resolve(applicationData);
                },"api")
            }).catch(reject);
    });
}

/**
 * Granting user access for application
 * @param applicationID
 * @param userid
 * @param alreadyAccessAsError
 * @returns {Promise<Object>}
 */
function grantApplicationAccess(applicationID, userid, alreadyAccessAsError=false) {
    return new Promise((resolve,reject)=>{
        getApplicationAccess(applicationID,userid)
            .then((data)=>alreadyAccessAsError?reject(errorCodes.APPLICATION_ALREADY_ACCESS):resolve(utilities.dropKeys(data,["_id"])))
            .catch(()=>{
                generateApplicationKeyPair()
                    .then((applicationKeyPair)=>{
                        let oauthData = {
                            application_id: applicationID,
                            userid: userid,
                            created: Date.now(),
                            access_token: applicationKeyPair[0],
                            access_secret: applicationKeyPair[1]
                        };

                        database.insertOne("oauth",oauthData,(error)=>{
                            if(error) return reject(errorCodes.ERROR);
                            delete oauthData._id;
                            resolve(oauthData);
                        },"api");
                    });
            });
    });
}

/**
 * Revoking user access from application
 * @param applicationID
 * @param userid
 * @param alreadyRevokedAsError
 * @returns {Promise<Object>}
 */
function revokeApplicationAccess(applicationID, userid, alreadyRevokedAsError=false) {
    return new Promise((resolve,reject)=>{
        getApplicationAccess(applicationID,userid)
            .then(()=>{
                database.deleteOne("oauth",{application_id:applicationID,userid:userid},(error)=>{
                    if(error) return reject(errorCodes.ERROR);
                    return resolve();
                },"api");
            })
            .catch(()=>alreadyRevokedAsError?reject(errorCodes.APPLICATION_ALREADY_REVOKED):resolve());
    });
}

/**
 * Verifying given parameters to each other for granted access
 * @param applicationID
 * @param applicationKey
 * @param applicationSecret
 * @param accessToken
 * @param accessSecret
 * @param returnUserData
 * @returns {Promise<Object>}
 */
function verifyOauthData(applicationID, applicationKey, applicationSecret, accessToken, accessSecret,returnUserData=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("application",{application_id:parseInt(applicationID),application_key:applicationKey,application_secret:applicationSecret},(error,application)=>{
            if(error) return reject(errorCodes.APPLICATION_UNKNOWN);
            database.findOne("oauth",{application_id:application.application_id,access_token:accessToken,access_secret:accessSecret},(error,oauthData)=>{
                if(error) return reject(errorCodes.APPLICATION_NO_PERMISSION);
                account.getUserByUserid(oauthData.userid,account.publicUserModel,true)
                    .then((userData)=>resolve([application,(returnUserData?userData:oauthData.userid)]))
                    .catch(reject);
            },"api");
        },"api");
    });
}

/**
 * Generating request token for application access
 * @param applicationID
 * @param applicationKey
 * @returns {Promise<Object>}
 */
function generateRequestToken(applicationID,applicationKey) {
    return new Promise((resolve,reject)=>{
        database.findOne("application",{application_id:applicationID,application_key:applicationKey},(error,application)=>{
            if(error) return reject(errorCodes.APPLICATION_UNKNOWN);
            generateRequestTokenInner((requestToken)=>{
                let data = {application_id:application.application_id,request_token:requestToken,created:Date.now(),expiration:Date.now()+config.settings.application_request_expiration};
                database.insertOne("request",data,(error)=>{
                    if(error) return reject(errorCodes.ERROR);
                    resolve(utilities.dropKeys(data,["_id"]));
                },"api")
            });
        },"api");
    });
}

/**
 * Inner method to generate unique request token
 * @param callback
 */
function generateRequestTokenInner(callback) {
    let requestToken = utilities.generateKey(64);
    database.count("request",{request_token:requestToken},(_,count)=>{
        if(count>0) return generateRequestTokenInner(callback);
        return callback(requestToken);
    },"api");
}

/**
 * Validating request token and returning application
 * @param requestToken
 * @returns {Promise<Object>}
 */
function validateRequestToken(requestToken) {
    return new Promise((resolve,reject)=>{
        database.findOne("request",{request_token:requestToken},(error,request)=>{
            if(error) return reject(errorCodes.REQUEST_TOKEN_INVALID);
            if(request.expiration<Date.now()) return reject(errorCodes.REQUEST_TOKEN_EXPIRED);
            getApplication(request.application_id)
                .then((application)=>{
                    resolve({request_token:requestToken,application:application});
                }).catch(reject);
        },"api");
    })
}

/**
 * Generating access bearer combined with request token and userid
 * @param requestToken
 * @param userid
 * @returns {Promise<Object>}
 */
function generateAccessBearer(requestToken,userid) {
    return new Promise((resolve,reject)=>{
        validateRequestToken(requestToken)
            .then((_data)=>{
                generateAccessBearerInner((accessBearer)=>{
                    let data = {access_bearer:accessBearer,request_token:requestToken,userid:userid,application_id:_data.application.application_id,created:Date.now(),expiration:Date.now()+config.settings.application_bearer_expiration};
                    database.insertOne("access",data,(error)=>{
                        if(error) return reject(errorCodes.ERROR);
                        return resolve(utilities.dropKeys(data,["_id"]));
                    },"api");
                });
            }).catch(reject);
    });
}

/**
 * Inner method to generate unique access bearer
 * @param callback
 */
function generateAccessBearerInner(callback) {
    let accessBearer = utilities.generateKey(80);
    database.count("access",{access_bearer:accessBearer},(_,count)=>{
        if(count>0) return generateAccessBearerInner(callback);
        return callback(accessBearer);
    },"api");
}

/**
 * Binding access bearer with application and granting oauth access
 * @param applicationId
 * @param applicationKey
 * @param applicationSecret
 * @param accessBearer
 * @returns {Promise<Object>}
 */
function bindUserApplication(applicationId, applicationKey, applicationSecret, accessBearer) {
    return new Promise((resolve,reject)=>{
        database.findOne("application",{application_id:applicationId,application_key:applicationKey,application_secret:applicationSecret},(error,application)=>{
            if(error) return reject(errorCodes.APPLICATION_UNKNOWN);
            database.findOne("access",{access_bearer:accessBearer,application_id:application.application_id},(error,accessData)=>{
                if(error) return reject(errorCodes.BEARER_INVALID);
                if(accessData.expiration<Date.now()) return reject(errorCodes.BEARER_EXPIRED);

                database.deleteOne("access",{access_bearer:accessBearer},()=>{},"api");
                database.deleteOne("request",{request_token:accessData.request_token},()=>{},"api");

                grantApplicationAccess(application.application_id,accessData.userid)
                    .then(resolve)
                    .catch(reject);
            },"api");
        },"api");
    });
}

function applicationMiddleware(req,res,next) {
    let returnUserData = typeof req.returnUserData !== "undefined" && req.returnUserData;
    try {
        if(typeof req.query["token"] === "undefined") return errorCodes.AUTHENTICATION_REQUIRED.printJSON(res);
        let token = req.query["token"];
        let authenticationCollection = (typeof Buffer.from === "function"?Buffer.from(token,"base64"):new Buffer(token,"base64")).toString('utf8').split(":");
        if(authenticationCollection.length!==5) return errorCodes.AUTHENTICATION_ITEMS.printJSON(res);

        verifyOauthData(authenticationCollection[0],authenticationCollection[1],authenticationCollection[2],authenticationCollection[3],authenticationCollection[4],returnUserData)
            .then((userData)=>{
                req.appData = userData;
                next();
            })
            .catch((error)=>res.json(error));
    } catch(e) {
        return errorCodes.ERROR.printJSON(res);
    }
}

function authenticationMiddleware(req,res,next) {
    try {
        if(typeof req.query["token"] === "undefined") return errorCodes.AUTHENTICATION_REQUIRED.printJSON(res);
        let token = req.query["token"];
        let authenticationCollection = (typeof Buffer.from === "function"?Buffer.from(token.split(" ")[1],"base64"):new Buffer(token.split(" ")[1],"base64")).toString('utf8').split(":");
        if(authenticationCollection.length!==3) return errorCodes.ERROR.printJSON(res);

        getApplication(authenticationCollection[0])
            .then((application)=>{
                if(application.application_key !== authenticationCollection[1] || application.application_secret !== authenticationCollection[2]) return errorCodes.ERROR.printJSON(res);

                req.application = application;
                return next();
            })
            .catch((error)=>error.printJSON(res));
    } catch(e) {
        return errorCodes.ERROR.printJSON(res);
    }
}

function generateAuthenticationNonce(applicationID) {
    return new Promise((resolve,reject)=>{
        getApplication(applicationID)
            .then((application)=>{
                if(!hasPermission(application,permissions.AUTHENTICATION)) return errorCodes.ERROR.printJSON(res);
                generateAuthenticationNonceInner((authenticationNonce)=>{
                    let model = {
                        authentication_nonce: authenticationNonce,
                        created: Date.now(),
                        expiration: (Date.now()+config.settings.authentication_nonce_expiration),
                        state: "generated",
                        application_id: application.application_id,
                        type: null
                    };
                    database.insertOne("authentications",model,(error)=>{
                        if(error) return reject(errorCodes.ERROR);
                        resolve(utilities.trimArray(model,["authentication_nonce","created","expiration","state","application_id"]));
                    },"authentication");
                });
            }).catch(reject);
    });
}

function generateAuthenticationNonceInner(callback) {
    let authenticationNonce = utilities.generateKey(64);
    database.count("authentications",{authentication_nonce:authenticationNonce},(_,count)=>{
        if(count>0) return generateAuthenticationNonceInner(callback);
        return callback(authenticationNonce);
    },"authentication");
}

function getAuthenticationNonce(_authenticationNonce,checkExpiration=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("authentications",{authentication_nonce:_authenticationNonce},(error,authenticationNonce)=>{
            if(error) return reject(errorCodes.AUTHENTICATION_NONCE_UNKNOWN);
            if(checkExpiration && authenticationNonce.expiration<=Date.now()) return reject(errorCodes.AUTHENTICATION_NONCE_EXPIRED);
            return resolve(authenticationNonce);
        },"authentication");
    });
}

function validateAuthenticationNonce(applicationID,_authenticationNonce,requiredState="generated") {
    return new Promise((resolve,reject)=>{
        getApplication(applicationID)
            .then((application)=>{
                getAuthenticationNonce(_authenticationNonce,true)
                    .then((authenticationNonce)=>{
                        if(authenticationNonce.application_id !== application.application_id) return reject(errorCodes.ERROR);
                        if(authenticationNonce.state !== requiredState) return reject(errorCodes.AUTHENTICATION_NONCE_USED);
                        return resolve(authenticationNonce);
                    }).catch(reject);
            }).catch(reject);
    });
}

/**
 * Returning application
 * @param applicationID
 * @param appendUserData
 * @returns {Promise<Object>}
 */
function getApplication(applicationID,appendUserData=false) {
    return new Promise((resolve,reject)=>{
        database.findOne("application",{application_id:parseInt(applicationID)},(error,application)=>{
            if(error) return reject(errorCodes.APPLICATION_ID_UNKNOWN);
            delete application._id;
            if(appendUserData) {
                account.getUserByUserid(application.user,account.publicUserModel,true)
                    .then((userData)=>{
                        application.user = userData;
                        return resolve(application);
                    })
                    .catch(()=>reject(errorCodes.APPLICATION_DELETED_USER));
            } else resolve(application);
        },"api");
    });
}

function updateAuthenticationNonce(_authenticationNonce,newState,data) {
    return new Promise((resolve,reject)=>{
        getAuthenticationNonce(_authenticationNonce)
            .then((authenticationNonce)=>{
                database.update("authentications",{authentication_nonce:authenticationNonce.authentication_nonce},{
                    $set: utilities.combineArrays({state:newState},data)
                },(error)=>{
                    if(error) return reject(errorCodes.ERROR);
                    return resolve(utilities.combineArrays(authenticationNonce,utilities.combineArrays({state:newState},data),true));
                },"authentication");
            }).catch(reject);
    });
}

module.exports = {
    createApplication           : createApplication,
    deleteApplication           : deleteApplication,
    updateApplicationKeys       : updateApplicationKeys,
    updateApplication           : updateApplication,
    getUserCreatedApplications  : getUserCreatedApplications,
    grantApplicationAccess      : grantApplicationAccess,
    revokeApplicationAccess     : revokeApplicationAccess,
    verifyOauthData             : verifyOauthData,
    generateRequestToken        : generateRequestToken,
    validateRequestToken        : validateRequestToken,
    generateAccessBearer        : generateAccessBearer,
    bindUserApplication         : bindUserApplication,
    applicationMiddleware       : applicationMiddleware,
    authenticationMiddleware    : authenticationMiddleware,
    generateAuthenticationNonce : generateAuthenticationNonce,
    validateAuthenticationNonce : validateAuthenticationNonce,
    getAuthenticationNonce      : getAuthenticationNonce,
    updateAuthenticationNonce   : updateAuthenticationNonce,
    getApplication              : getApplication
};
