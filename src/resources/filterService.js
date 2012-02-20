/**
 * Copyright (c) 2010 Andres Hernandez Monge
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL COPYRIGHT HOLDERS OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://thumbnailzoomplus/common.js");

/**
 * The Filter Service.
 */
ThumbnailZoomPlus.FilterService = {
  /* Pages info list. */
  pageList : [
    ThumbnailZoomPlus.Pages.Amazon, // 0
    ThumbnailZoomPlus.Pages.DailyMile,
    ThumbnailZoomPlus.Pages.DeviantART,
    ThumbnailZoomPlus.Pages.Engadget,
    ThumbnailZoomPlus.Pages.Facebook,
    ThumbnailZoomPlus.Pages.Flickr, // 5
    ThumbnailZoomPlus.Pages.Fotop,
    ThumbnailZoomPlus.Pages.GMail, // before Google so it takes priority.
    ThumbnailZoomPlus.Pages.GooglePlus, // before Google so it takes priority.
    ThumbnailZoomPlus.Pages.Google,
    ThumbnailZoomPlus.Pages.Hi5,
    ThumbnailZoomPlus.Pages.IMDb,
    ThumbnailZoomPlus.Pages.Imgur, // 12
    ThumbnailZoomPlus.Pages.LastFM,
    ThumbnailZoomPlus.Pages.LinkedIn,
    ThumbnailZoomPlus.Pages.MySpace,
    ThumbnailZoomPlus.Pages.OkCupid,
    ThumbnailZoomPlus.Pages.PhotoBucket,
    ThumbnailZoomPlus.Pages.Pinterest,
    ThumbnailZoomPlus.Pages.Photosight, // 19
    ThumbnailZoomPlus.Pages.Picasa,
    ThumbnailZoomPlus.Pages.Tagged,
    ThumbnailZoomPlus.Pages.Twitpic,
    ThumbnailZoomPlus.Pages.Twitter,
    ThumbnailZoomPlus.Pages.YouTube, // 24
    ThumbnailZoomPlus.Pages.Wikipedia,
    
    // The next two must be last so they are lower priority.
    ThumbnailZoomPlus.Pages.Others,
    ThumbnailZoomPlus.Pages.Thumbnail
  ],

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the resource.
   */
  _init : function() {
    this._logger = ThumbnailZoomPlus.getLogger("ThumbnailZoomPlus.FilterService");
    this._logger.trace("_init");
    
    let pageCount = this.pageList.length;
    
    for (let i = 0; i < pageCount; i++) {
      this.pageList[i].aPage = i;
    }
  },

  /**
   * Gets the host of the specified document (if it has one and the
   * protocol is supported by TZP); otherwise returns null.
   *
   * Caution: this routine is somewhat slow; avoid calling it more than
   * necessary.
   */
  getHostOfDoc : function(aDocument) {
    // If enableFileProtocol, then the add-on is enabled for file:// URLs
    // (typically used with the Others page type).  This is useful during
    // debugging, but we don't normally enable it in the released version
    // since we aren't sure if there might be subtle security risks.
    let enableFileProtocol = false;
    
    // Get location from document or image.
    // TODO: to really do this right we'd need to split part of
    // getImageSource up so we can properly find the image/link URL
    // even before we know the page.  Or else call getImageSource on
    // each aPage, if that's not too slow.
    let protocol = null;
    let host = null;
    if (aDocument.location) {
      host = aDocument.location.host;
      protocol = aDocument.location.protocol;
    }
    if (! host || !protocol) {
      let imageSource = aDocument.src;
      if (imageSource) {
        // this._logger.debug("    getHostOfDoc: trying loc from aDocument.src "
        //                   + imageSource);
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]  
                            .getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(imageSource, aDocument.characterSet, null);
        try {
          host = uri.host;
          protocol = uri.scheme + ":";
        } catch (e) {
          // uri.host throws an exception when the thumb's image data is
          // embedded in the URL, e.g. from Google Images for very small images
          // (eg size 'icon') or from flickr.com thumbs on main page when 
          // not logged in, e.g.
          // data:image/jpeg;base64,/9j...
          this._logger.debug("getHostOfDoc: unable to get host or protocol: " + e);
        }
        uri = null;
      }
    }
    if (! host || !protocol) {
      this._logger.debug("    getHostOfDoc: Reject; couldn't get host from " + 
                         aDocument + "; got " + protocol + "//" + host);
      return null;
    }

    if (("http:" == protocol ||
         "https:" == protocol ||
         (enableFileProtocol && "file:" == protocol))) {
      return host;
    }
    this._logger.debug("    getHostOfDoc: Reject by protocol for " + 
                       protocol + "//" + host);
    return null;
  },

  testPageConstantByHost : function(host, aPage) {
    let hostRegExp = this.pageList[aPage].host;
    if (hostRegExp.test(host)) {
      this._logger.debug("    testPageConstantByHost: FOUND  '" +
                         this.pageList[aPage].key + "' (" + aPage + ") for " + 
                         host +
                         " based on regexp " + this.pageList[aPage].host );
      return true;
    }
    this._logger.debug("    testPageConstantByHost: Reject '" +
                       this.pageList[aPage].key + "' (" + aPage + ") for " + 
                       host +
                       " based on regexp " + this.pageList[aPage].host );
    return false;
  },

  /**
   * Detects and gets the page constant.
   * @param aDocument the document object, which could be the document
   * of the entire web page or an image node or <a href=...> node.
   * @return the page constant or -1 if none matches.
   */
  getPageConstantByDoc : function(aDocument, startFromPage) {
    let pageConstant = -1;
    let name = "?";
    
    let host = this.getHostOfDoc(aDocument);
    if (host == null) {
      return pageConstant;
    }
    let pageCount = this.pageList.length;
    
    for (let i = startFromPage; i < pageCount; i++) {
      if (this.testPageConstantByHost(host, i)) {
        pageConstant = i;
        name = this.pageList[i].key;
        break;
      }
    }

    return pageConstant;
  },

  /**
   * Gets the page constant (index of pageList) by name.
   * @param aPageName the page name.
   * @return the page constant.
   */
  getPageConstantByName : function(aPageName) {
    this._logger.debug("getPageConstantByName");

    let pageCount = this.pageList.length;
    let pageConstant = -1;

    for (let i = 0; i < pageCount; i++) {
      if (this.pageList[i].key == aPageName) {
        pageConstant = i;
        break;
      }
    }

    return pageConstant;
  },

  /**
   * Gets the page name.
   * @param aPageConstant the page constant.
   * @return the page constant name ("key").
   */
  getPageName : function(aPageConstant) {
    let name = this.pageList[aPageConstant].key;
    this._logger.debug("getPageName " + aPageConstant + " = " + name);
    return name;
  },

  /**
   * Verify if the page is enabled.
   * @param aPage the page constant.
   * @return true if the page is enabled, false otherwise.
   */
  isPageEnabled : function(aPage) {
    // this._logger.debug("isPageEnabled " + aPage);

    let pageEnable = false;
    let pageName = this.getPageName(aPage);

    if (null != pageName) {
      pageEnable = ThumbnailZoomPlus.isNamedPageEnabled(pageName);
    }

    return pageEnable;
  },

  /**
   * Toggles the value of the page if enabled.
   * @param aPage the page constant.
   */
  togglePageEnable : function(aPage) {
    this._logger.debug("togglePageEnable " + aPage);

    let pageName = this.getPageName(aPage);

    if (null != pageName) {
      let pageEnable = ThumbnailZoomPlus.isNamedPageEnabled(pageName);

      let pagePrefKey = ThumbnailZoomPlus.PrefBranch + pageName + ".enable";
      ThumbnailZoomPlus.setPref(pagePrefKey, !pageEnable);
    }
  },

  _applyBaseURI : function(aDocument, url) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]  
                      .getService(Components.interfaces.nsIIOService);
    var baseUri = ioService.newURI(aDocument.baseURI, aDocument.characterSet, null);
    var uri = ioService.newURI(url, aDocument.characterSet, baseUri);
    this._logger.debug("_applyBaseURI(, " + url + ") = " + uri.spec);
    return uri.spec;
  },
  
  /**
   * Gets the image source, handle special cases.
   * @param aNode the html node.
   * @param aPage the page constant.
   * @return object with fields:
   *     imageURL: string (null if not apply);
   *     noTooSmallWarning: boolean
   */
  getImageSource : function(aDocument, aNode, aPage) {
    let result = {imageURL: null, noTooSmallWarning: false};
    let pageInfo = this.pageList[aPage];
    this._logger.debug("getImageSource: page " + aPage + " " + pageInfo.key);

    let nodeName = aNode.localName.toLowerCase();
    this._logger.debug("getImageSource: node name: " + nodeName + "; src: " +
                       aNode.getAttribute("src") + "; href: " + aNode.getAttribute("href"));
    let imageSource =  null;
    let imgImageSource = null;
    if ("img" == nodeName) {
      imageSource = aNode.getAttribute("src");
      imageSource = this._applyBaseURI(aDocument, imageSource);
      imgImageSource = imageSource;
      this._logger.debug("getImageSource: node name: canonical URL: " + imageSource);
    }

    // check special cases
    if (null != imageSource && pageInfo.getSpecialSource) {
      imageSource = pageInfo.getSpecialSource(aNode, imageSource);
      this._logger.debug("getImageSource: node name: getSpecialSource returned " + imageSource);
    }
    
    // check other image nodes.
    // TODO: perhaps we should change this to put the conditional
    // only around the call to getImageNode(), and if pageInfo doesn't
    // have getImageNode, use aNode itself as the imageNode.getImageSource
    // which detects background images.
    if (null == imageSource && pageInfo.getImageNode) {
      let nodeClass = aNode.getAttribute("class");
      let imageNode = null;
      imageNode = pageInfo.getImageNode(aNode, nodeName, nodeClass);      
      if (imageNode) {
        if (imageNode.hasAttribute("src")) {
          imageSource = imageNode.getAttribute("src");
          this._logger.debug("getImageSource: got image source from src attr of " + imageNode);
        } else if (imageNode.hasAttribute("href")) {
          // for an <a href=> node, use javascript string conversion rather
          // than retrieving the html attribute so it'll apply the base
          // document's URL for missing components of the URL (eg domain).
          imageSource = String(imageNode);
          this._logger.debug("getImageSource: got image source from href of " + imageNode);
          if (/^https?:\/\/t\.co\//.test(imageSource)) {
			      // Special case for twitter http://t.co links; the actual
			      // URL is in the link's tooltip.
            imageSource = imageNode.title;
          }
        } else {
          let backImage = imageNode.style.backgroundImage;

          if (backImage && "" != backImage && ! /none/i.test(backImage)) {
            this._logger.debug("getImageSource: got image source from backgroundImage of " + imageNode);
            imageSource = backImage.replace(/url\(\"/, "").replace(/\"\)/, "");
          }
        }
      }
    }
    if (imageSource != null) {
      imageSource = this._applyBaseURI(aDocument, imageSource);
    }
    this._logger.debug("getImageSource: using image source       " + imageSource +
                       "; noTooSmallWarning=" + result.noTooSmallWarning);
    
    result.imageURL = imageSource;
    
    return result;
  },

  /**
   * Filters an image source url.
   * @param aImageSrc the image source url.
   * @param aPage the page constant.
   * @return true if valid, false otherwise.
   */
  filterImage : function(aImageSrc, aPage) {
    this._logger.debug("filterImage");

    let validImage = false;
    let exp = this.pageList[aPage].imageRegExp;
    let regExp = new RegExp(exp);

    if (regExp.test(aImageSrc)) {
      validImage = true;
    } else {
      this._logger.debug("ThumbnailPreview: filterImage rejected " + aImageSrc + " using " + exp);
    }

    return validImage;
  },

  /**
   * Gets the zoomed image source.
   * @param aImageSrc the image source url.
   * @param aPage the filtered page.
   * @return the zoomed image source, null if none could be found, or "" if
   *  one was found, but for a site which the user disabled.
   */
  getZoomImage : function(aImageSrc, aPage) {
    this._logger.debug("getZoomImage");

    let pageInfo = this.pageList[aPage];
    let zoomImage = pageInfo.getZoomImage(aImageSrc);
    this._logger.debug("ThumbnailPreview: getZoomImage returned " + zoomImage);

    return zoomImage;
  }
};

/**
 * Constructor.
 */
(function() { this._init(); }).apply(ThumbnailZoomPlus.FilterService);
