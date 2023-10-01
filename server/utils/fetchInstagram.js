"use strict";

const axios = require("axios").default;

module.exports = {
  async fetchInstagramApi(url, params) {
    let status, body, headers;
    let allData = [];

    let pageUrl = `${url}?${this.arrayToUrlParams(params)}`;

    while(pageUrl) {
      const apiResult = await axios({
        url: pageUrl,
        method: 'get',
        data: body,
        headers: headers,
      })
        .then((response) => {
          status = response.status;
          return response.data;
        })
        .catch((error) => {
          if (error.response) {
            // The request was made and the server responseponded with a status code
            // that falls out of the range of 2xx
            console.log("Instagram API response error");
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            status = error.response.status;
            return error.response.data;
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log("Instagram API request error");
            console.log(error);
            status = 500;
            return { error: error.message };
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Instagram fetch critical error");
            console.error(error);
            status = 500;
            return { error: error.message };
          }
        });

        if ( apiResult ) {
          allData = allData.concat(apiResult.data);

          if ( apiResult.paging && apiResult.paging.next ) pageUrl = apiResult.paging.next;
          else pageUrl = null;
        } else {
          pageUrl = null;
        }
    }

    return {data: allData, status: status};
  },

  async fetchInstagramApiForToken(url, params) {
    let status;

    let body = this.arrayToUrlParams(params);
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        }

    const apiResult = await axios({
      url: url,
      method: 'post',
      data: body,
      headers: headers,
    })
    .then((response) => {
      status = response.status;
      return response.data;
    })
    .catch((error) => {
      if (error.response) {
        // The request was made and the server responseponded with a status code
        // that falls out of the range of 2xx
        console.log("Instagram API response error");
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
        status = error.response.status;
        return error.response.data;
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log("Instagram API request error");
        console.log(error);
        status = 500;
        return { error: error.message };
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Instagram fetch critical error");
        console.error(error);
        status = 500;
        return { error: error.message };
      }
    });

    apiResult.status = status;
    return apiResult;
  },

  async callInstagramApi(uri, params) {
    const instagram_url = "https://api.instagram.com";
    return this.fetchInstagramApiForToken(`${instagram_url}${uri}`, params);
  },

  async callInstagramGraph(uri, params) {
    const instagram_url = "https://graph.instagram.com";
    return this.fetchInstagramApi(`${instagram_url}${uri}`, params);
  },

  arrayToUrlParams(hash) {
    const params = new URLSearchParams();
    Object.keys(hash).forEach((key) => params.append(key, hash[key]));
    return params;
  },
};
