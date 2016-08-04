require('cloud/hello');
require('cloud/token');

Parse.Cloud.define('sendToken', function(request, response) {
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

  response.success('sendToken OK');
});
