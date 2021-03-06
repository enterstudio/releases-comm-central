/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
  * You can obtain one at http://mozilla.org/MPL/2.0/. */

var MODULE_NAME = "cloudfile-helpers";

var RELATIVE_ROOT = "../shared-modules";
var MODULE_REQUIRES = ["folder-display-helpers", "mock-object-helpers"];

ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var os = {};
ChromeUtils.import('resource://mozmill/stdlib/os.js', os);

var Cr = Components.results;

var kMockContractIDPrefix = "@mozilla.org/mail/mockCloudFile;1?id=";

var kDefaults = {
  iconClass: "chrome://messenger/skin/icons/box-logo.png",
  accountKey: null,
  settingsURL: "",
  managementURL: "",
  authErr: Ci.nsIMsgCloudFileProvider.authErr,
  offlineErr: Ci.nsIMsgCloudFileProvider.offlineErr,
  uploadErr: Ci.nsIMsgCloudFileProvider.uploadErr,
  uploadWouldExceedQuota: Ci.nsIMsgCloudFileProvider.uploadWouldExceedQuota,
  uploadExceedsFileLimit: Ci.nsIMsgCloudFileProvider.uploadExceedsFileLimit,
  uploadCanceled: Ci.nsIMsgCloudFileProvider.uploadCanceled,
};

var fdh, moh;

function setupModule(module) {
  fdh = collector.getModule("folder-display-helpers");
  fdh.installInto(module);

  moh = collector.getModule("mock-object-helpers");
  moh.installInto(module);
}

function installInto(module) {
  setupModule(module);
  module.gMockCloudfileManager = gMockCloudfileManager;
  module.MockCloudfileAccount = MockCloudfileAccount;
  module.getFile = getFile;
  module.collectFiles = collectFiles;
}


function getFile(aFilename, aRoot) {
  let path = os.getFileForPath(aRoot);
  let file = os.getFileForPath(os.abspath(aFilename, path));
  fdh.assert_true(file.exists, "File " + aFilename + " does not exist.");
  return file;
}

/**
 * Helper function for getting the nsIFile's for some files located
 * in a subdirectory of the test directory.
 *
 * @param aFiles an array of filename strings for files underneath the test
 *               file directory.
 * @param aFileRoot the file who's parent directory we should start looking
 *                  for aFiles in.
 *
 * Example:
 * let files = collectFiles(['./data/testFile1', './data/testFile2'],
 *                          __file__);
 */
function collectFiles(aFiles, aFileRoot) {
  return aFiles.map(filename => getFile(filename, aFileRoot));
}

function MockCloudfileAccount() {
  for(let someDefault in kDefaults)
    this[someDefault] = kDefaults[someDefault];
}

MockCloudfileAccount.prototype = {

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIMsgCloudFileProvider]),

  init: function MCA_init(aAccountKey) {
    this.accountKey = aAccountKey;
  },

  uploadFile: function MCA_uploadFile(aFile, aListener) {
    aListener.onStartRequest(null, null);
    fdh.mc.window.setTimeout(function() {
      aListener.onStopRequest(null, null, Cr.NS_OK);
    }, 0);
  },

  urlForFile: function MCA_urlForFile(aFile) {
    return "http://www.example.com/" + this.accountKey + "/" +
           aFile.leafName;
  },

  refreshUserInfo: function MCA_refreshUserInfo(aWithUI,
                                                aCallback) {
    aCallback.onStartRequest(null, null);
    aCallback.onStopRequest(null, null, Cr.NS_OK);
  },

  cancelFileUpload: function MCA_cancelFileUpload(aFile) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  providerUrlForError: function MCA_providerUrlForError(aStatusCode) {
    return "";
  },

  deleteFile: function MCA_deleteFile(aFile, aCallback) {
    aCallback.onStartRequest(null, null);
    fdh.mc.window.setTimeout(function() {
      aCallback.onStopRequest(null, null, Cr.NS_OK);
    }, 0);
  },

  get displayName() {
    return "Mock Storage: " + this.accountKey;
  },
};


function MockCloudfileProviderGenerator(aID, aOverrides) {
  let constructor = function MockCloudfileAccount() {

    for(let someDefault in kDefaults)
      this[someDefault] = kDefaults[someDefault];

    for (let override in aOverrides)
      this[override] = aOverrides[override];

    this.type = aID;
  }

  constructor.prototype = MockCloudfileAccount.prototype;

  return constructor;
}

var gMockCloudfileManager = {
  _mock_map: {},

  register: function MCM_register(aID, aOverrides) {
    if (!aID)
      aID = "default";

    if (aID in this._mock_map)
      throw Error("Already registered a mock cloudfile provider with id = " +
                  aID);

    if (!aOverrides)
      aOverrides = {};

    let mockContractID = kMockContractIDPrefix + aID;
    let mockID = aID;
    let mockCID = this._generateCID();

    let component = new moh.MockObjectRegisterer(
      mockContractID,
      mockCID,
      MockCloudfileProviderGenerator(aID, aOverrides));

    this._mock_map[aID] = component;

    gCategoryManager.addCategoryEntry("cloud-files", mockID,
                                      mockContractID, false, true);
    this._mock_map[aID].register();
  },

  unregister: function MCM_unregister(aID) {
    if (!aID)
      aID = "default";

    if (!(aID in this._mock_map))
      throw Error("No registered mock cloudfile provider with id = " +
                  aID);

    gCategoryManager.deleteCategoryEntry("cloud-files", aID, false);
    this._mock_map[aID].unregister();
    delete this._mock_map[aID];
  },

  _generateCID: function MCM__generateCID() {
    let uuid = this._uuidService.generateUUID().toString();
    return uuid.replace('{', '').replace('}', '');
  },
}

XPCOMUtils.defineLazyServiceGetter(gMockCloudfileManager, "_uuidService",
                                   "@mozilla.org/uuid-generator;1",
                                   "nsIUUIDGenerator");

XPCOMUtils.defineLazyServiceGetter(this, "gCategoryManager",
                                   "@mozilla.org/categorymanager;1",
                                   "nsICategoryManager");

