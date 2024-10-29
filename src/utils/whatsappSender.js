import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.WHATSAPP_URL;
const authorization = process.env.WHATSAPP_API;

const SendWhatsapp = async (name,number,salonName,Date) => {
    try {
        const placeholders = [name,number,salonName,Date];
        var postData = JSON.stringify({
            "messages": [
                {
                    "from": "447860099299",
                    "to": "916284947309",
                    "messageId": "4b0b4e27-d222-4017-8d62-b6e56805b4c2",
                    "content": {
                        "templateName": "subscription",
                        "templateData": {
                            "body": {
                                "placeholders": placeholders
                            }
                        },
                        "language": "en"
                    }
                }
            ]
        });


        console.log('Post Data:', postData);
        

        const options = {
            method: 'POST',
            hostname: baseUrl,
            path: '/whatsapp/1/message/template',
            headers: {
                'Authorization': `App ${authorization}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            maxRedirects: 20
        };

        const reqPost = https.request(options, (resPost) => {
            let chunks = [];

            resPost.on("data", (chunk) => {
                chunks.push(chunk);
            });

            resPost.on("end", () => {
                const body = Buffer.concat(chunks);
                console.log('Response Status:', resPost.statusCode);
                console.log('Response Body:', body.toString());
                res.status(resPost.statusCode).json(JSON.parse(body.toString()));
            });

            resPost.on("error", (error) => {
                console.error('Request Error:', error);
                res.status(500).json({ error: error.message });
            });
        });

        reqPost.write(postData);
        reqPost.end();
    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
}

export { SendWhatsapp };