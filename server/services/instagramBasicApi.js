'use strict';

const instagramSettings = require('../utils/settings');
const { getPluginSettings, setPluginSettings } = instagramSettings;
const fetchInstagram = require('../utils/fetchInstagram');
const fetchMedia = require('../utils/fetchMedia');
const dateUtils = require('../utils/dateUtils');

const album_fields = 'id,media_type,media_url,thumbnail_url,username,timestamp,permalink';
const media_fields = `${album_fields},caption`;

const dbImageName = 'plugin::instagram.instaimage';

module.exports = ({ strapi }) => ({
  async downloadAlbum(parent, token) {
    const album = await fetchInstagram.callInstagramGraph(
      `/${parent.id}/children`,
      {
        access_token: token,
        fields: album_fields,
      },
    );
    const media = [];
    album.data.forEach((element) => {
      if (element.media_type === 'IMAGE' || (element.media_type === 'VIDEO' && settings.instagram_allow_videos)) {
        media.push({
          mediaId: parent.id,
          id: element.id,
          url: element.media_url,
          timestamp: element.timestamp,
          caption: parent.caption,
          mediaType: element.media_type,
          permalink: element.permalink,
          thumbnailUrl: element.media_type === 'VIDEO' ? element.thumbnail_url : null
        });
      }
    });
    return media;
  },

  async downloadImages(force = false) {
    const settings = await getPluginSettings();
    const token =
      settings.shortLivedAccessToken || settings.longLivedAccessToken;

    if (token === undefined) {
      return {
        error: 'Instagram download images error, there is no token!',
        status: 400,
      };
    }

    if (
      !force &&
      dateUtils.dateDifferenceToNow(
        settings.lastDownloadTime,
        dateUtils.minute,
      ) < 10
    ) {
      return { download: false };
    }

    const instagramMedia = await fetchInstagram.callInstagramGraph(
      '/me/media',
      {
        access_token: token,
        fields: media_fields,
      },
    );

    if (instagramMedia.error !== undefined) {
      if (instagramMedia.error.code == 190 && instagramMedia.error.type == "OAuthException") {
        settings.shortLivedAccessToken = undefined;
        settings.longLivedAccessToken = undefined;
        settings.lastApiResponse = JSON.stringify(instagramMedia);
        await setPluginSettings(settings);
      };  
      return { 
        download: false,
        error: instagramMedia.error
      };
    }

    let images = [];
    for (let element of instagramMedia.data) {
      if (element.media_type === 'IMAGE' || (element.media_type === 'VIDEO' && settings.instagram_allow_videos)) {
        images.push({
          mediaId: element.id,
          id: element.id,
          url: element.media_url,
          timestamp: element.timestamp,
          caption: element.caption,
          mediaType: element.media_type,
          permalink: element.permalink,
          thumbnailUrl: element.media_type === 'VIDEO' ? element.thumbnail_url : null
        });
      } else if (element.media_type === 'CAROUSEL_ALBUM') {
        const album = await this.downloadAlbum(element, token);
        images = images.concat(album);
      }
    }
    await this.insertImagesToDatabase(images);
    settings.lastDownloadTime = new Date();
    await setPluginSettings(settings);
    return images;
  },

  async isImageExists(image) {
    const entry = await strapi.db.query(dbImageName).findOne({
      where: { instagramId: image.id },
    });
    return entry != null;
  },

  async insertImagesToDatabase(images) {
    for (let image of images) {
      const imageExists = await this.isImageExists(image);

      if (!imageExists) {
        if (settings.instagram_allow_download) {
          const mediaItem = await fetchMedia.uploadToLibrary(image.id,image.url);
        }

        const entry = await strapi.db.query(dbImageName).create({
          data: {
            instagramId: image.id,
            timestamp: image.timestamp,
            caption: image.caption,
            permalink: image.permalink,
            mediaId: image.mediaId,
            mediaType: image.mediaType,
            originalUrl: image.url,
            thumbnailUrl: image.thumbnailUrl,
            media: mediaItem ?? null,
            publishedAt: new Date()
          },
        });
      }
    }
  },
});
