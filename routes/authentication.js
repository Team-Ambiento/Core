const express          = require("express"),
    account            = require("../services/account"),
    apiService         = require("../services/apiService"),
    utilities          = require("../core/utilities"),
    errorCodes         = require("../core/errorCodes"),
    router             = express.Router({});

/**
 * POST-Registration-Procedure
 */
router.post("/registration",(req,res)=>{
    if(utilities.isKeyMissing(req.body,["email","password","username"])) return res.json(errorCodes.MISSING_KEYS);

    let oauthData;

    account.registerUser(req.body.email,req.body.password,req.body.username)
        .then((userData)=>apiService.grantApplicationAccess(3317635751600713,userData.userid))
        .then((_oauthData)=>{oauthData=_oauthData; return apiService.getApplication(3317635751600713)})
        .then((applicationData)=>res.json({
            userid: oauthData.userid,
            application_id: applicationData.application_id,
            application_key: applicationData.application_key,
            application_secret: applicationData.application_secret,
            access_token: oauthData.access_token,
            access_secret: oauthData.access_secret,
            combinedQuery: Buffer.from(applicationData.application_id+":"+applicationData.application_key+":"+applicationData.application_secret+":"+oauthData.access_token+":"+oauthData.access_secret).toString("base64")
        }));
});

/**
 * POST-Login-Procedure
 */
router.post("/login",(req,res)=>{
    if(utilities.isKeyMissing(req.body,["key","password"])) return res.json(errorCodes.MISSING_KEYS);

    let oauthData;

    account.loginUser(req.body.key,req.body.password)
        .then((userData)=>apiService.grantApplicationAccess(3317635751600713,userData.userid))
        .then((_oauthData)=>{oauthData=_oauthData; return apiService.getApplication(3317635751600713)})
        .then((applicationData)=>res.json({
            userid: oauthData.userid,
            application_id: applicationData.application_id,
            application_key: applicationData.application_key,
            application_secret: applicationData.application_secret,
            access_token: oauthData.access_token,
            access_secret: oauthData.access_secret,
            combinedQuery: Buffer.from(applicationData.application_id+":"+applicationData.application_key+":"+applicationData.application_secret+":"+oauthData.access_token+":"+oauthData.access_secret).toString("base64")
        }));
});

module.exports = router;
