const self = require('sdk/self');
const { version } = require('sdk/system/xul-app');
const  { search } = require('sdk/places/bookmarks');
const pageMod = require('sdk/page-mod');
const simplePrefs = require('sdk/simple-prefs');

const main = () => {
  const newtaburl = self.data.url("index.html");
  const { Cc, Ci, Cu } = require('chrome');

  Cu.import("resource://gre/modules/XPCOMUtils.jsm");
  XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils", "resource://gre/modules/PlacesUtils.jsm");
  
  if (parseFloat(version) < 44) {
    require('resource:///modules/NewTabURL.jsm').NewTabURL.override(newtaburl);
  } else {
    const aboutNewTabService = Cc['@mozilla.org/browser/aboutnewtab-service;1'].getService(Ci.nsIAboutNewTabService);

    aboutNewTabService.newTabURL = newtaburl;
  }

  var pagemod = null;
  function reloadStyle() {
    if (pagemod !== null) {
      pagemod.destroy();
    }

    var stylefile = [];
    var styletext = [];
    if (!simplePrefs.prefs["useCustom"]) {
      var preset = simplePrefs.prefs["presetStyle"];
      presets = [
        "basic",
        "solarized-dark",
        "solarized-light",
        "tomorrow",
        "tomorrow-night",
        "tomorrow-night-blue",
        "tomorrow-night-eighties",
        "tomorrow-night-bright"
      ];
      if (preset >= 0 && preset < presets.length) {
        stylefile = self.data.url(presets[preset] + ".css");
      }
    } else {
      var filename = simplePrefs.prefs["customcss"];
      var fileIO = require("sdk/io/file");
      if (filename && fileIO.exists(filename)) {
        var fileread = fileIO.open(filename, "r");
        styletext = fileread.read();
        fileread.close()
      } else {
        stylefile = self.data.url("basic.css");
      }
    }

    pagemod = pageMod.PageMod({
      include: newtaburl,
      contentScriptFile: self.data.url("newtab.js"),
      contentStyleFile: stylefile,
      contentStyle: styletext,
      contentScriptWhen: "ready",
      onAttach: function(worker) {
        // find the startpage folder
        var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
        var options = historyService.getNewQueryOptions();
        var query = historyService.getNewQuery();

        var bookmarksService = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
        var menuFolder = bookmarksService.bookmarksMenuFolder;

        query.setFolders([menuFolder], 1);

        var result = historyService.executeQuery(query, options);
        var rootNode = result.root;
        rootNode.containerOpen = true;

        for (var i = 0; i < rootNode.childCount; i++) {
          var node = rootNode.getChild(i);
          if (node.title === "startpage" && node.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER) {
            var spfolder = node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
            spfolder.containerOpen = true;
            for (var i = 0; i < spfolder.childCount; i++) {
              var node = spfolder.getChild(i);
              if (node.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER) {
                var subfolder = node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
                worker.port.emit("newfolder", subfolder.title);
                subfolder.containerOpen = true;
                for (var j = 0; j < subfolder.childCount; j++) {
                  var item = subfolder.getChild(j);
                  if (item.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_SEPARATOR) {
                  } else if (item.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_URI) {
                    worker.port.emit("newitem", item.title, item.uri);
                    (function(i, j) {
                      PlacesUtils.keywords.fetch({url: item.uri}).then(function(e) {
                        if (e) {
                          worker.port.emit("keyword", i, j, e.keyword);
                        }
                      });
                    })(i, j);
                  }
                }
                subfolder.containerOpen = false;
              }
            }
            spfolder.containerOpen = false;
            break;
          }
        }
      }});
  }
  reloadStyle();

  simplePrefs.on("", reloadStyle);
};

exports.main = main;
