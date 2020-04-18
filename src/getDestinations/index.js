const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {

    const data = await dynamodb.query({
        KeyConditionExpression: `UserId = :userId`,
        ExpressionAttributeValues:{
            ":userId": event.requestContext.authorizer.claims['cognito:username']
        },
        TableName: "Destinations",
    }).promise()

    return{
        statusCode: 200,
        body: JSON.stringify(data.Items),
        headers:{
            'Access-Control-Allow-Origin': '*'
        }
    };
};
