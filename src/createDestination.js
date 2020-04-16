const jwtDecode = require('jwt-decode');
exports.handler = async (event, context) => {
    const token = jwtDecode(event.headers.Authorization);
    return {
        statusCode: 200,
        body: JSON.stringify({token, event, context}),
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    };
};
