const ImageKit = require('@imagekit/nodejs');
const ImageKitCore = require('imagekit');
require('dotenv').config();

const imagekit = new ImageKitCore({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

async function uploadFile(file, fileName, mimeType) {
    try {
        const uploadOptions = {
            file: file,
            fileName: fileName,
            folder: '/quiz-media',
            useUniqueFileName: true
        };
        
        // Add tags based on file type
        if (mimeType) {
            if (mimeType.startsWith('video/')) {
                uploadOptions.tags = ['video', 'quiz'];
            } else if (mimeType.startsWith('image/')) {
                uploadOptions.tags = ['image', 'quiz'];
            }
        }
        
        console.log('ImageKit upload options:', uploadOptions);
        
        const result = await imagekit.upload(uploadOptions);
        
        console.log('ImageKit upload result:', {
            fileId: result.fileId,
            name: result.name,
            url: result.url,
            fileType: result.fileType,
            filePath: result.filePath
        });
        
        return result;
    } catch (error) {
        console.error('ImageKit upload error:', error);
        throw error;
    }
}

module.exports = { imagekit, uploadFile };
