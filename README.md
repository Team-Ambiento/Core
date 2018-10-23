# Core
Core for Project-Ambiento

## Requirements

### MongoDB
Ambiento requires a MongoDB instance to run, we recommend min version 3.6^
>Download MongoDB https://www.mongodb.com/download-center/community

If you have enabled authentication (we recommend), you create your database user this way

```
#Redirecting to admin database (used for authentication, can be changed in middleware/database.js)
use admin

#Creating user with read-write permissions for ambiento (or other name for your default database) and api database
db.createUser({user: YOUR_NAME, pwd: YOUR_PASSWORD, roles: [ { role: "readWrite", db: "ambiento" }, { role: "readWrite", db: "api}]})
```

Copy your credentials in your config.js

```
mongo: {
        ambiento: {
            auth: true,
            host: "127.0.0.1",
            port: 27017,
            data: "ambiento",
            username: "YOUR_NAME",
            password: "YOUR_PASSWORD"
        }
    }
```

### NodeJS
Ambiento Core runs with Node.JS, we recommend version 8.12.0^
> Download NodeJS https://nodejs.org/en/

### Spotify API
Ambiento runs with the Spotify API and requires an spotify-application
> Create Application https://developer.spotify.com/dashboard/

Copy your clientID, clientSecret and RedirectionURI into your config.js
```
services: {
        spotify: {
            client_id: "YOUR_CLIENT_ID",
            client_secret: "YOUR_CLIENT_SECRET",
            redirect_uri: "YOUR_URI"
        }
    }
```

## Ambiento Setup

### Create Application
For presentation we did not created an endpoint for the api-service, but an fully working backend api-service

You can create your application after the successful initialization of the database this way:
```
apiService.createApplication(userid (currently always -1, for presentation purposes), title, description, website, callbackURL)
  .then(application=>console.log(application))
  .catch(error=>console.log(error));
```

### Create User
If you want to create an user you can use this method:
```
account.registerUser(email, password, username, displayName=username)
  .then(userData=>console.log(userData))
  .catch(error=>console.log(error));
```

### Grant Application Access
You can easily combine both methods with application access:
```
let application;
apiService.createApplication(undefined, title, description, website, callbackURL)
  .then(_application=>{application=_application; return account.registerUser(email, password, username, displayName))
  .then(userData=>apiService.grantApplicationAccess(application.applicationID, userData.userid))
  .then(oauthData=>console.log(utilities.combineArrays(application,oauthData)))
  .catch(error=>console.log(error));
```

:warning: You need to update hard-coded application-id inside roues/authentication.js :warning:
We will fix this issue in future commits

## REST-API
Ambiento offers an REST-API for the Spotify-Authentication, Ambiento-Data, ...

### Authentication Token
After creating an user you'll need an base64 hash with your authentication credentials

> Base64(applicationID:applicationKey:applicationSecret:accessToken:accessSecret)

This hash can look like this:

> MzMxNzYzNTc1MTYwMDcxMzpkVG5UdXA2NEVDN2pFWTlSRXFHTWhUTlJwb0JCeFpOQWJobkl1SndWakRuM2NGTHREQzpUN2xmM01qUDY0NmxyeHI3cEUzQkpCNmhWTjZieU1uZHpFVXRESVdjRUVHd1ZnVzFrNjp5S25GWXdIUDd0dzdad0VxNDF1dmtlTGZ0ZGhLblY0aXBlZkRzSTNIQ3p0YzM3bTFkWDo5dlF0dDN3aTNSVWl5YXVvRWVuYkV4RW5PUTA5dkVuUnJvbW5OT01BWk5tNWJYYUszVg

Copy this hash into your query with `?token=YOUR_TOKEN`

### `GET` Spotify Authentication-URL

To authenticate the client with Spotify you perform this request

> YOUR_APPLICATION_URL/service/spotify/login?token=YOUR_TOKEN

Example Response:
```
{  
   "result":"success",
   "url":"https://accounts.spotify.com/authorize?response_type=code&client_id=c2848171f77546c791e82839d722e538&scope=user-read-recently-played%20streaming%20user-read-currently-playing&redirect_uri=http%3A%2F%2FA_URL%2Fservice%2Fspotify%2Fauthentication&state=6355154112472146"
}
```

### `GET` Receiving Ambiento-Data

> YOUR_APPLICATION_URL/data?token=YOUR_TOKEN

Example Response:
```
{  
   "authenticated_user":"demineforce",
   "current_track":"Fire by Magnificence",
   "mood_color_rgb":{  
      "red":41,
      "green":126,
      "blue":179
   },
   "mood_color_hex":"#297eb3",
   "happyness":0.263,
   "energy":0.824,
   "type":"permanent",
   "enabled":true,
   "brightness":1
}
```

### `POST` Updating Ambiento Settings

To update settings with your authenticated user perform this request

| Key  | Value | Description | Optional |
| ------------- | ------------- | ------------- | ------------- |
| type  | permanent / blinking / rainbow | Type of lightning  | Yes |
| enabled  | true / false  | Enable Ambiento feedback | Yes |
| brightness | 0.0 - 1.0 | Set brightness of Ambiento devices | Yes |


> YOUR_APPLICATION_URL/update?token=YOUR_TOKEN Body (urlencoded): {type: type, enabled: enabled, brightness: brightness}

### `POST` Authentication

For demo purposes we added a login and registration endpoint but we recommend to remove them or add an authenticationMiddleware to prevent account overflow

## Known issues

Because we only had 1 1/2 days we did not finished this project and did not fixed every bug or security issue. We will try to continue this project and add features, add more modules for better Ambiento-Support and more.

- Spotify Refresh Token is not always working
- No Application and Authentication Endpoints
- YOUR_APPLICATION_URL/data sometimes returning error connected with Spotify error
- /update not working very well

## Licence

![Creative Commons Namensnennung-Nicht kommerziell 4.0 International Lizenz](https://i.creativecommons.org/l/by-nc/4.0/88x31.png)
> Ambiento by Team Ambiento is licensed under a Creative Commons Attribution-Noncommercial 4.0 International License.

You can modify this project with Team Ambiento attribution for non commercial purposes
