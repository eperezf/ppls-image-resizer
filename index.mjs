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
	{ width: 370, height: 247 }, // 33% Landscape
	{ width: 585, height: 293 }, // 50% Landscape Half Height
	{ width: 770, height: 513 }, // 66% Landscape
	{ width: 1155, height: 770 }, // 100% Landscape
	{ width: 1170, height: 585 }, // Screen Ladnscape Small
	{ width: 1500, height: 750 }, // Screen Landscape
	{ width: 293, height: 293 }, // 25% Square
	{ width: 390, height: 390 }, // 33% Square
	{ width: 585, height: 585 }, // 50% Square
	{ width: 900, height: 900 }, // 66% Square
	{ width: 370, height: 490 }, // 33% Portrait
	{ width: 585, height: 775 }, // 50% Portrait
	{ width: 770, height: 1020 }, // 66% Portrait
	
	{ width: 293, height: null }, // 25%
	{ width: 770, height: null }, // 50%
	{ width: 1400, height: null }, // 66%
	
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
	var text = Buffer.from(event.body, 'base64').toString('ascii');
	const imageObject = JSON.parse(text)
	const filename = imageObject.Key

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
	console.time("Resize and upload")
	const imageByteArray = await res.Body.transformToByteArray()
	const image = sharp(imageByteArray)
	const imageMetadata = await image.metadata()
	//console.log(imageMetadata);
	await Promise.all(resolutions.map(async (resolution) => {
		// Do not oversize
		if (resolution.width < imageMetadata.width) {
			let resized = await image
			.resize(resolution.width, resolution.height)
			.jpeg({ force: false, quality: 80, chromaSubsampling: imageMetadata.chromaSubsampling })
			.png({ force: false, quality: 80 })
			.toBuffer();
			let newImageMetadata = await sharp(resized).metadata()
			let data = {
				Key: `${imageFilename}-${newImageMetadata.width}x${newImageMetadata.height}${imageExtension}`,
				Body: resized,
				ContentType: `image/${imageMetadata.format}`,
			};
			let putCommand = new PutObjectCommand({Bucket: process.env.BUCKET_NAME, ...data})
			//console.log(data);
			try {
				let putResponse = await S3.send(putCommand)
				//console.log(putResponse);
			} catch (error) {
				console.log(error)
				return 0
			}
		} else {
			//console.log(`Skipping resolution ${resolution.width}x${resolution.height} as it is larger than the original image`)
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

