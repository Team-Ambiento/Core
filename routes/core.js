const express          = require("express"),
    spotifyService     = require("../services/spotifyService"),
    apiService         = require("../services/apiService"),
    account            = require("../services/account"),
    utilities          = require("../core/utilities"),
    errorCodes         = require("../core/errorCodes"),
    router             = express.Router({});

/**
 * Returning data from Spotify and user-settings
 */
router.get("/data",apiService.applicationMiddleware,(req,res)=>{
    let spotifyData;
    spotifyService.getSpotifyUserData(req.appData[1])
        .then((_spotifyData)=>{spotifyData=_spotifyData; return account.getAmbientoSettings(req.appData[1])})
        .then((data)=>res.json(utilities.combineArrays(spotifyData,data)))
        .catch((error)=>res.json(error));
});

/**
 * Updating user-settings (keys: enabled, type, brightness)
 */
router.post("/update",apiService.applicationMiddleware,(req,res)=>{
    account.updateAmbientoSettings(req.appData[1],req.body)
        .then(()=>res.json({result:"success"}))
        .catch((error)=>res.json(error));
});

module.exports = router;
