const jwtDecode = require('jwt-decode');

exports.handler = async (event, context) => ({
    token: jwtDecode(event.params.header.Authorization),
    event,
    context

});
