let SpotifyWebApi  = require('spotify-web-api-node'),
    database       = require("../middleware/database"),
    utilities      = require("../core/utilities"),
    errorCodes     = require("../core/errorCodes"),
    accountService = require("./account"),
    request        = require("request"),
    config         = require("../config");

/**
 * Generating redirection url from spotify with scopes and callback url from configuration
 * @returns {Promise<string>}
 */
function generateRedirectionURL() {
    let scopes = "user-read-recently-played streaming user-read-currently-playing";
    return Promise.resolve('https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + config.services.spotify.client_id +
        (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
        '&redirect_uri=' + encodeURIComponent(config.services.spotify.redirect_uri));
}

/**
 * Generating access token from refresh or bearer-token
 * @param code {String}
 * @param type {String="authorization_code"}
 * @returns {Promise<Object>}
 */
function getAccessToken(code,type="authorization_code") {
    return new Promise((resolve,reject)=>{
        console.log("Fetching AccessToken ("+type+")");
        request({
            method: 'POST',
            uri: "https://accounts.spotify.com/api/token",
            json: true,
            form: {
                client_id: config.services.spotify.client_id,
                client_secret: config.services.spotify.client_secret,
                grant_type:type,
                code:code,
                redirect_uri: config.services.spotify.redirect_uri
            }},(error,_,body)=>{
            if(error) return reject(errorCodes.ERROR);
            try {
                let accessToken     = body.access_token,
                    refreshToken    = type==="authorization_code"?body.refresh_token:code,
                    expiresIn       = typeof body.expires_in !== "undefined"?(Date.now()+(body.expires_in*1000)):(Date.now(3600*1000));

                console.log("Received AccessToken");
                return resolve([accessToken,refreshToken,expiresIn]);
            } catch(e) {
                return reject(errorCodes.ERROR);
            }
        });
    });
}

/**
 * Updating Spotify User-Data
 * @param userid {String|Number}
 * @param accessToken {String}
 * @param refreshToken {String}
 * @param expiresIn {Number}
 * @returns {Promise<Object>}
 */
function updateUserData(userid, accessToken, refreshToken, expiresIn) {
    return new Promise((resolve,reject)=>{
        console.log("Updating UserData");
        accountService.getUserByUserid(userid)
            .then(()=>database.deleteOne("spotify_client",{userid:parseInt(userid)},()=>database.insertOne("spotify_client",{userid:parseInt(userid),access_token:accessToken,expires_in:expiresIn,refresh_token:refreshToken},(error)=>error?reject(errorCodes.ERROR):resolve([accessToken,refreshToken]))));
    });
}

/**
 * Validating expiration of Spotify-API
 * @param userid {Number|String}
 * @returns {Promise<Object>}
 */
function refreshClient(userid) {
    return new Promise((resolve,reject)=>{
        database.findOne("spotify_client",{userid:parseInt(userid)},(error,spotifyClient)=>{
            if(error) return reject(errorCodes.SPOTIFY_NOT_CONNECTED);
            if(spotifyClient.expires_in+10000 > Date.now()) return resolve(spotifyClient);
            console.log("Refreshing Client");
            getAccessToken(spotifyClient.refresh_token,"refresh_token")
                .then((data)=>updateUserData(userid,data[0],data[1],data[2]))
                .then(()=>database.findOne("spotify_client",{userid:parseInt(userid)},(error,spotifyClient)=>error?reject(errorCodes.SPOTIFY_NOT_CONNECTED):resolve(spotifyClient)))
                .catch(()=>reject(errorCodes.ERROR));
        });
    });
}

/**
 * Returning current Spotify-Data with mood color, recent track, ...
 * @param userid {Number|String}
 * @returns {Promise<Object>}
 */
function getSpotifyUserData(userid) {
    return new Promise((resolve,reject)=>{
        refreshClient(userid).then((spotifyClient)=>{
            let apiClient = new SpotifyWebApi({
                clientId:     config.services.spotify.client_id,
                clientSecret: config.services.spotify.client_secret,
                redirectUri:  config.services.spotify.redirect_uri
            });

            console.log("Parsing Spotify UserData");

            apiClient.setAccessToken(spotifyClient.access_token);
            apiClient.setRefreshToken(spotifyClient.refresh_token);
            apiClient.getMyCurrentPlayingTrack()
                .then((data)=>{
                    if(typeof data.body.item !== "undefined") {
                        let track    = data.body.item,
                            trackID  = data.body.item.id,
                            userData;
                        apiClient.getMe()
                            .then((_userData)=>{userData=_userData.body; return apiClient.getAudioFeaturesForTrack(trackID)})
                            .then((data)=>filterMood(data.body))
                            .then((mood)=>resolve({authenticated_user: userData.display_name,current_track:track.name+" by "+track.artists[0].name,mood_color_rgb:{red:mood[0][0],green:mood[0][1],blue:mood[0][2]},mood_color_hex:mood[1],happyness:mood[2], energy:mood[3]}))
                            .catch((error)=>reject(error));
                    } else {
                        let track = "-";
                        apiClient.getMe()
                            .then((userData)=>resolve({authenticated_user: userData.display_name,current_track:track.name,mood_color_rgb:{red:255,green:255,blue:255},mood_color_hex:"#ffffff",happyness:0.0}))
                            .catch((error)=>reject(error));
                    }
                })
                .catch((error)=>reject(error));
        }).catch(reject);
    })
}


/**
 * Mixing several colors together
 * @param colors {Object}
 * @returns {number[]}
 */
function mixColors(colors) {

    let red = 0, green = 0, blue = 0;
    colors.splice(0,1);
    colors.forEach((color)=>{
        red+=color[0];
        green+=color[1];
        blue+=color[2];
    });

    red/=colors.length;
    green/=colors.length;
    blue/=colors.length;
    return [Math.round(red),Math.round(green),Math.round(blue)];
}

/**
 * Returning hex from rgb object
 * @param rgb {number[]}
 * @returns {string}
 */
function rgb2hex(rgb){
    return (rgb && rgb.length >= 3) ? "#" +
        ("0" + parseInt(rgb[0],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) : '';
}

/**
 * Mixing two colors to each other with dominance value
 * @param color1 {number[]}
 * @param color2 {number[]}
 * @param value {number}
 * @returns {number[]}
 */
function mixMoodColors(color1, color2, value) {
    let toMix = [], color1Count=0, color2Count=0;
    for(let i = 0; i < value/0.1; i++) {
        toMix.push(color1);
        color1Count++;
    }
    for(let i = 0; i < (1.0-value)/0.1; i++) {
        toMix.push(color2);
        color2Count++;
    }
    return mixColors(toMix);
}

/**
 * Filtering colors with each other with Spotfy-Data
 * @param data {Object}
 * @returns {Promise<*[]>}
 */
function filterMood(data) {
    let valenceColor = mixMoodColors([104,159,56],[25,118,210],data.valence);
    let energyColor = mixMoodColors([255,235,59],[106,27,154],data.energy);

    let rgb = mixMoodColors(energyColor,valenceColor,.5);
    return Promise.resolve([rgb, rgb2hex(rgb), data.valence, data.energy]);
}

module.exports = {
    generateRedirectionURL  : generateRedirectionURL,
    getAccessToken          : getAccessToken,
    getSpotifyUserData      : getSpotifyUserData,
    updateUserData          : updateUserData
};