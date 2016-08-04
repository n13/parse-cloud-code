function promiseResponse(promise, response) {
    promise.then(function(o) {
        response.success(o);
    }, function(error) {
        response.error(error);
    })
}

/**
 * @param {Function(request, response)} func
 */
function defineParseCloud(func) {
    Parse.Cloud.define(func.name, func);
}

function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function guid() {
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                   s4() + '-' + s4() + s4() + s4();
}

function guid20() {
      return s4() + s4() + s4() + s4() + s4();
}



function sendUserToken()
/**
 * Create a token to sign in with for the user, send the token to the client via email
 *
 * @param {Object} request Require request.params.email
 * @param {Object} response
 * @returns {String} sessionToken
 */
function sendToken(request, response) {

    // Simple syntax to create a new subclass of Parse.Object.
    var Token = Parse.Object.extend("Token");

    var query = new Parse.Query("Token");
    query.equalTo("email", request.params.email);
    query.find().then(function(results) {
        results[0].delete();
    });

    // Create a new token.
    var token = new Token();
    token.set("token", guid());
    token.set("email", request.params.email);

    token.save(null, {
        success: function(token) {
            // Execute any logic that should take place after the object is saved.
            alert('New object created with objectId: ' + token.id);
        },
        error: function(token, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            alert('Failed to create new object, with error code: ' + error.message);
        }
    });


}

/**
 * Returns twitchUser
 *
 * @param {String} token
 * @returns {Promise<TwitchUser>} twitchUser
 * @see https://github.com/justintv/twitch-api
 * @see https://github.com/justintv/Twitch-API/blob/master/authentication.md#scope
 */
function getTwitchUser(accessToken) {
    return Parse.Cloud.httpRequest({
        url: "https://api.twitch.tv/kraken/user",
           params: {
               oauth_token: accessToken
           }
    }).then(function(httpResponse) {
        return JSON.parse(httpResponse.text);
    });
}

/**
 * Returns email
 *
 * @param {String} token
 * @returns {Promise<String>} email
 */
function getEmail(accessToken) {
    return getTwitchUser(accessToken).then(function(twitchUser) {
        return twitchUser.email; // { email: "abc@example.com" }
    });
}

/**
 * Returns the session token of available parse user via twitch access token within `request.params.accessToken`.
 *
 * <pre>
 * {access_token: "", firebase_id: "", provider: ""} // from oauth.io
 * </pre>
 *
 * @param {Object} request Require request.params.accessToken
 * @param {Object} response
 * @returns {String} sessionToken
 */
function signInWithTwitch(request, response) {
    promiseResponse(signInWithTwitchPromise(request.user, request.params.access_token, request.params.expires_time), response);
}

/**
 * Returns the session token of available parse user via twitch access token.
 *
 * @param {Parse.User} user
 * @param {String} accessToken
 * @param {Number} expiresTime
 * @returns {Promise<String>} sessionToken
 */
// Nik: TODO modify this this to create a valid user session from a token
function signInWithTwitchPromise(user, accessToken, expiresTime) {
    Parse.Cloud.useMasterKey();

    var userPromise;

    if (user) { // login
        userPromise = Parse.Promise.as(user);
    } else { // not login
        if (!accessToken) {
            return Parse.Promise.error("Require accessToken parameter");
        }

        userPromise = getTwitchUser(accessToken).then(function(twitchUser) {
            if (!twitchUser) return Parse.Promise.error("Invalid token");
            //console.log(twitchUser.email);

            var userQuery = new Parse.Query(Parse.User);
            userQuery.equalTo("email", twitchUser.email);
            userQuery.equalTo("username", twitchUser.name);
            return userQuery.first().then(function(user) {
                if (user) {
                    //console.log("found:user:" + JSON.stringify(user.toJSON()));
                    //console.log("found:token:1:" + user.getSessionToken());
                    //console.log("found:token:2:" + user._sessionToken);
                    //console.log("found:token:3:" + user.sessionToken);
                    return user;
                }

                var newUser = new Parse.User();
                var username = twitchUser.name;
                var password = "twitch" + guid20();

                newUser.setUsername(username); // assert username not duplicated
                newUser.setPassword(password);
                newUser.setEmail(twitchUser.email);

                var attrs = {
                    // exception: {"code":251,"message":"custom credential verification for auth service twitch failed"}
                    //"authData": {
                    //    "twitch": {
                    //        "id": twitchUser._id,
                    //        "access_token": accessToken,
                    //        "expires_time": expiresTime
                    //    }
                    //},
                    uid: twitchUser._id.toString()
                };
                console.log("signUp");
                return newUser.signUp(attrs);
            });
        });
    }

    // ref. http://stackoverflow.com/questions/29489008/parse-why-does-user-getsessiontoken-return-undefined
    var password = "twitch" + guid20(); // FIXME it's necessary for signUp?
    return userPromise.then(function(user) {
        if (!user) return Parse.Promise.error("Twitch user not found");

        user.set("password", password);
        return user.save();
    }).then(function(user){
        return Parse.User.logIn(user.get("username"), password);
    }).then(function(user){
        //console.log("final:user:" + JSON.stringify(user.toJSON()));
        //console.log("final:token:1:" + user.getSessionToken());
        //console.log("final:token:2:" + user._sessionToken);
        //console.log("final:token:3:" + user.sessionToken);
        return user.getSessionToken();
    });
}

defineParseCloud(sendToken);
