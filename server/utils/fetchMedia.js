const axios = require('axios').default;
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const promisify = require('util').promisify;
const mime = require('mime-types');

module.exports = {
  getFileDetails(filePath) {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) reject(err.message);
        resolve(stats);
      });
    });
  },

  deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) reject(err.message);
        resolve('deleted');
      });
    });
  },

  async uploadToLibrary(name,imageByteStreamURL) {
    let ext = imageByteStreamURL.split('?')[0].split('.');
    const filePath = `${process.env.PWD}./tmp/${name}.${ext[ext.length-1]}`;
    const { data } = await axios.get(imageByteStreamURL, {
      responseType: 'stream',
    });

    const file = fs.createWriteStream(filePath);
    const finished = promisify(stream.finished);
    data.pipe(file);
    await finished(file);
    const image = await this.upload(filePath, 'uploads');
    return image;
  },

  async upload(filePath, saveAs) {
    const stats = await this.getFileDetails(filePath);
    const fileName = path.parse(filePath).base;

    const res = await strapi.plugins.upload.services.upload.upload({
      data: { path: saveAs },
      files: {
        path: filePath,
        name: fileName,
        type: mime.lookup(filePath),
        size: stats.size,
      },
    });

    await this.deleteFile(filePath);
    return res[0];
  },
};
