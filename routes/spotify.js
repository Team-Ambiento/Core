const express          = require("express"),
    spotifyService     = require("../services/spotifyService"),
    apiService         = require("../services/apiService"),
    utilities          = require("../core/utilities"),
    errorCodes         = require("../core/errorCodes"),
    router             = express.Router({});

/**
 * Login procedure for Spotify, returning authentication url, callback in configuration
 */
router.get("/service/spotify/login",apiService.applicationMiddleware,(req,res)=>{
    spotifyService.generateRedirectionURL()
        .then((url)=>res.json({result:"success",url:url+"&state="+req.appData[1]}));
});

/**
 * Callback handling for Spotify authentication after callback
 */
router.get("/service/spotify/authentication",(req,res)=>{
    if(utilities.isKeyMissing(req.query,["code","state"])) return res.json(errorCodes.MISSING_KEYS);
    let state = req.query.state;
    spotifyService.getAccessToken(req.query.code)
        .then((data)=>spotifyService.updateUserData(state,data[0],data[1],data[2]))
        .then(()=>spotifyService.getSpotifyUserData(state))
        .then(()=>res.render("authentication"))
        .catch((error)=>res.json(error));
});

module.exports = router;
