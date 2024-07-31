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

const resolutions = [
	{width: 100, height: 100},
	{width: 1024, height: 540},
	{width: 1155, height: 760},
	{width: 1170, height: 585},
	{width: 1400, height: 739},
	{width: 1440, height: 750},
	{width: 293, height: 155},
	{width: 293, height: 293},
	{width: 300, height: 158},
	{width: 370, height: 247},
	{width: 370, height: 490},
	{width: 390, height: 390},
	{width: 585, height: 293},
	{width: 585, height: 585},
	{width: 585, height: 760},
	{width: 770, height: 406},
	{width: 770, height: 513},
	{width: 770, height: 760},
	{width: 900, height: 760},
]

const allowedExtensions = [
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.gif',
	'.svg'
]

const regex = /(.*)(\.[0-9a-z]+$)/ig

export const handler = async (event, context) => {
	const body = JSON.parse(event.body)
	const filename = body.filename

	console.time("Process Image")
	console.log(`Resizing file ${filename}`);
	var imageExtension = ''
	var imageFilename = ''
	const extractor = filename.matchAll(regex)
	for (const match of extractor) {
		imageFilename = match[1]
		imageExtension = match[2]
	}

	if (!allowedExtensions.includes(imageExtension)) {
		console.error('File extension is not an image. Aborting.')
		return 0
	}


	console.time("R2 Get Object")
	let command = new GetObjectCommand({Bucket: process.env.BUCKET_NAME, Key: filename})
	var res = {}
	try {
		res = await S3.send(command)
	} catch (error) {
		if (error.Code == 'NoSuchKey') {
			console.error('No such key')
			return 0
		} else {
			console.log(error)
		}
	}
	console.timeEnd("R2 Get Object")
	const imageByteArray = await res.Body.transformToByteArray()
	const image = sharp(imageByteArray)
	const imageMetadata = await image.metadata()
	console.time("Resize and upload")
	await Promise.all(resolutions.map(async (resolution) => {
		let resized = await image
			.resize(resolution.width, resolution.height)
			.jpeg({ force: false, quality: 80, chromaSubsampling: imageMetadata.chromaSubsampling })
			.png({ force: false, quality: 80 })
			.toBuffer();
		
		let data = {
			Key: `${imageFilename}-${resolution.width}x${resolution.height}${imageExtension}`,
			Body: resized,
			ContentType: `image/${imageMetadata.format}`,
		};
		let putCommand = new PutObjectCommand({Bucket: process.env.BUCKET_NAME, ...data})
		try {
			let putResponse = await S3.send(putCommand)
			//console.log(putResponse);
		} catch (error) {
			console.log(error)
			return 0
		}
	}));
	console.timeEnd("Resize and upload")
	console.timeEnd("Process Image")

  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};

