class ErrorCode {

    constructor(code,message) {
        this.result = "error";
        this.code = code;
        this.message = message;
    }

    exportJSON() {
        return {result:"error",code:this.code,message:this.message};
    }

    printJSON(res) {
        res.json(this.exportJSON());
    }
}

module.exports = {
    ErrorCode: ErrorCode,
    ERROR: new ErrorCode(-1,"Error"),
    PBKDF2_ENCRYPTION_ERROR: new ErrorCode(1,"Failed encrypting password"),
    PASSWORD_VERIFICATION_FAILED: new ErrorCode(2,"Failed verifying password"),
    USERNAME_IN_USE: new ErrorCode(3,"Username is already in use"),
    USERNAME_RESERVED: new ErrorCode(4,"Username is reserved"),
    EMAIL_IN_USE: new ErrorCode(5,"E-Mail is already in use"),
    EMAIL_INVALID: new ErrorCode(6,"Invalid E-Mail-Address"),
    PASSWORD_INVALID: new ErrorCode(7,"Invalid Password"),
    USERID_GENERATION_FAILURE: new ErrorCode(8,"Failed generating userid"),
    DATABASE_REQUIRED: new ErrorCode(9,"Database is required"),
    STORAGE_SALT_ERROR: new ErrorCode(10,"Failed storing salt"),
    STORE_USER_ERROR: new ErrorCode(11,"Failed storing user"),
    UNKNOWN_SALT_ID: new ErrorCode(12,"Unknown salt-id"),
    USERNAME_INVALID: new ErrorCode(13,"Invalid Username"),
    DISPLAY_NAME_INVALID: new ErrorCode(14,"Invalid Display-Name"),
    USERNAME_NOT_EXISTS: new ErrorCode(15,"Username does not exist"),
    EMAIL_NOT_EXISTS: new ErrorCode(16,"Email does not exist"),
    USER_NOT_EXISTS: new ErrorCode(19,"User does not exist"),
    APPLICATION_TITLE_INVALID: new ErrorCode(55,"Invalid title"),
    APPLICATION_TITLE_IN_USE: new ErrorCode(56,"Title already in use"),
    APPLICATION_DESCRIPTION_INVALID: new ErrorCode(57,"Invalid description"),
    URL_INVALID: new ErrorCode(58,"Invalid URL"),
    APPLICATION_WEBSITE_INVALID: new ErrorCode(58,"Application website-url invalid"),
    APPLICATION_CALLBACK_INVALID: new ErrorCode(58,"Application callback-url invalid"),
    APPLICATION_ID_UNKNOWN: new ErrorCode(59,"Unknown ApplicationID"),
    APPLICATION_DELETED_USER: new ErrorCode(60,"Application creator does not exist anymore"),
    APPLICATION_MEMBER_CREATOR: new ErrorCode(61,"Member cannot be creator of application"),
    APPLICATION_ALREADY_MEMBER: new ErrorCode(62,"User is already member of application"),
    APPLICATION_INVALID_ACCESS_LEVEL: new ErrorCode(63,"Invalid access level"),
    APPLICATION_USER_NOT_MEMBER: new ErrorCode(64,"User is not member of application"),
    APPLICATION_NO_ACCESS: new ErrorCode(65,"No user access granted for application"),
    APPLICATION_ALREADY_ACCESS: new ErrorCode(66,"Application already has user access"),
    APPLICATION_ALREADY_REVOKED: new ErrorCode(67,"User has already revoked application access"),
    APPLICATION_UNKNOWN: new ErrorCode(68,"Unknown application"),
    APPLICATION_NO_PERMISSION: new ErrorCode(69,"No permission granted"),
    REQUEST_TOKEN_INVALID: new ErrorCode(70,"Invalid request token"),
    REQUEST_TOKEN_EXPIRED: new ErrorCode(71,"Request token expired"),
    BEARER_INVALID: new ErrorCode(72,"Invalid Bearer"),
    BEARER_EXPIRED: new ErrorCode(73,"Bearer expired"),
    AUTHENTICATION_REQUIRED: new ErrorCode(74,"Authentication required"),
    AUTHENTICATION_OAUTH: new ErrorCode(75,"Invalid authentication"),
    AUTHENTICATION_ITEMS: new ErrorCode(76,"5 values split with : required"),
    APPLICATION_NO_CREATOR: new ErrorCode(77,"User is not creator of application"),
    MISSING_KEYS: new ErrorCode(89,"Missing keys"),
    NEW_PASSWORD_MATCHES: new ErrorCode(92,"New password cannot be the old password"),
    SPOTIFY_NOT_CONNECTED: new ErrorCode(94,"Spotify is not connected")
};