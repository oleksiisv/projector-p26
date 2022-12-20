// dependencies
const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

// get reference to S3 client
const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const srcBucket = event.Records[0].s3.bucket.name;

    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const pngBucket = "p25-png";
    const gifBucket = "p26-gif";

    // Infer the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return;
    }

    // Check that the image type is supported
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

    // Download the image from the S3 source bucket.

    try {
        const params = {
            Bucket: srcBucket,
            Key: srcKey
        };
        var origImage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    // Use the sharp module to convert the image and save in a buffer.
    try {
        var pngImg = await sharp(origImage.Body).png().toBuffer();
        var gifImg = await sharp(origImage.Body).gif().toBuffer();

    } catch (error) {
        console.log(error);
        return;
    }

    // Upload the GIF converted image to the destination bucket
    try {
        const gifParams = {
            Bucket: gifBucket,
            Key: srcKey + ".gif",
            Body: gifImg,
            ContentType: "image"
        };

        const gifPutResult = await s3.putObject(gifParams).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    // Upload the PNG converted image to the destination bucket
    try {
        const pngParams = {
            Bucket: pngBucket,
            Key: srcKey + ".png",
            Body: pngImg,
            ContentType: "image"
        };

        const pngPutResult = await s3.putObject(pngParams).promise();

    } catch (error) {
        console.log(error);
        return;
    }
}