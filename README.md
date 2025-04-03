# Pisapapeles Lambda Image Resizer

This repo is an image resizer for Pisapapeles.net. It uses Sharp as the package for the resizing tools and Cloudflare R2 for the image storage.

## Requirements
* AWS Account
* R2 Bucket and access credentials
* Lambda function

## Usage
1. Clone the repo
2. Go to the folder where you cloned the repo
3. run ```npm install```
4. Upload the folder to your Lambda function (including ```node_modules```)
5. Setup an URL where the function will be called.

