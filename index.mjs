import 'dotenv/config'

import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";

import sharp from 'sharp';

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});





export const handler = async (event, context) => {

	console.log(event.filename);

	let command = new GetObjectCommand({Bucket: process.env.BUCKET_NAME, Key: event.filename})
	var res = {}
	try {
		res = await S3.send(command)
		console.log(res)
	} catch (error) {
		if (error.Code == 'NoSuchKey') {
			console.error('No such key')
			return 0
		} else {
			console.log(error)
		}
	}

	const imageByteArray = await res.Body.transformToByteArray()
	const image = sharp(imageByteArray)

	const imageMetadata = await image.metadata()
	console.log(imageMetadata);

	const resizedImage = await image.resize(100, 100).toBuffer()

	// let data = {
	// 	Key: 'resized-' + event.filename,
	// 	Body: resizedImage,
	// 	ContentType: 'image/png'
	// }

	// let putCommand = new PutObjectCommand({Bucket: process.env.BUCKET_NAME, ...data})
	// let putResponse = await S3.send(putCommand)
	// console.log(putResponse)





  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};

