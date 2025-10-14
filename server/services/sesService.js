import AWS from "aws-sdk";

AWS.config.update({ region: process.env.AWS_REGION });

const ses = new AWS.SES();

export async function sendEmail(to, subject, body) {
  const params = {
    Source: process.env.SES_SENDER_EMAIL, // verified sender
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } }
    }
  };

  return ses.sendEmail(params).promise();
}
