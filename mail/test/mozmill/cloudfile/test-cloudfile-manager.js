/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the richlistbox in the manager for attachment storage
 * services
 */

var Cu = Components.utils;
var Cc = Components.classes;
var Ci = Components.interfaces;

var MODULE_NAME = 'test-cloudfile-manager';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers',
                       'pref-window-helpers',
                       'window-helpers',
                       'cloudfile-helpers'];

ChromeUtils.import("resource://gre/modules/Services.jsm");

var kTestAccountType = "mock";

function setupModule(module) {
  for (let lib of MODULE_REQUIRES) {
    collector.getModule(lib).installInto(module);
  }

  gMockCloudfileManager.register(kTestAccountType);

  // Let's set up a few dummy accounts;
  create_dummy_account("someKey1", kTestAccountType,
                       "carl's Account");
  create_dummy_account("someKey2", kTestAccountType,
                       "Amber's Account");
  create_dummy_account("someKey3", kTestAccountType,
                       "alice's Account");
  create_dummy_account("someKey4", kTestAccountType,
                       "Bob's Account");
}

function teardownModule(module) {
  Services.prefs.QueryInterface(Ci.nsIPrefBranch)
          .deleteBranch("mail.cloud_files.accounts");
  gMockCloudfileManager.unregister(kTestAccountType);
}

function create_dummy_account(aKey, aType, aDisplayName) {
  Services.prefs.setCharPref("mail.cloud_files.accounts." + aKey + ".type",
                             aType);

  Services.prefs.setCharPref("mail.cloud_files.accounts." + aKey + ".displayName",
                             aDisplayName);
}

function destroy_account(aKey) {
  Services.prefs.clearUserPref("mail.cloud_files.accounts." + aKey);
}

/**
 * A helper function to open the preferences dialog and switch
 * to the attachments pane.
 *
 * @param aCallback the function to execute once we've switched
 *                  to the attachment pane.  This function takes
 *                  precisely one argument, which is the
 *                  augmented controller for the preferences
 *                  window.
 */
function open_cloudfile_manager(aCallback) {
  open_pref_window("paneApplications", function(w) {
    let tabbox = w.e("attachmentPrefs");
    tabbox.selectedIndex = 1;
    aCallback(w);
    close_window(w);
  });
}

/**
 * Tests that we load the accounts and display them in the
 * account richlistbox in the correct order (by displayName,
 * case-insensitive)
 */
function test_load_accounts_and_properly_order() {
  open_cloudfile_manager(function(w) {
    let richList = w.e("cloudFileView");
    assert_equals(4, richList.itemCount,
                  "Should be displaying 4 accounts");

    // Since we're sorting alphabetically by the displayName,
    // case-insensitive, the items should be ordered with the
    // following accountKeys:
    //
    // someKey3, someKey2, someKey4, someKey1
    const kExpected = ["someKey3", "someKey2", "someKey4",
                       "someKey1"];

    for (let [index, expectedKey] of kExpected.entries()) {
      let item = richList.getItemAtIndex(index);
      assert_equals(expectedKey, item.value,
                    "The account list is out of order");
    }
  });
}
