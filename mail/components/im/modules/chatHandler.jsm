/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

this.EXPORTED_SYMBOLS = ["allContacts", "onlineContacts", "ChatCore"];

ChromeUtils.import("resource:///modules/imServices.jsm");
ChromeUtils.import("resource:///modules/iteratorUtils.jsm");
ChromeUtils.import("resource:///modules/mailServices.js");

var allContacts = {};
var onlineContacts = {};

var ChatCore = {
  initialized: false,
  _initializing: false,
  init: function() {
    if (this._initializing)
      return;
    this._initializing = true;

    ChromeUtils.import("resource:///modules/index_im.js");

    Services.obs.addObserver(this, "browser-request");
    Services.obs.addObserver(this, "contact-signed-on");
    Services.obs.addObserver(this, "contact-signed-off");
    Services.obs.addObserver(this, "contact-added");
    Services.obs.addObserver(this, "contact-removed");

    // The initialization of the im core may trigger a master password prompt,
    // so wrap it with the async prompter service. Note this service already
    // waits for the asynchronous initialization of the password service.
    Components.classes["@mozilla.org/messenger/msgAsyncPrompter;1"]
              .getService(Components.interfaces.nsIMsgAsyncPrompter)
              .queueAsyncAuthPrompt("im", false, {
      onPromptStart: function() {
        Services.core.init();

        // Find the accounts that exist in the im account service but
        // not in nsMsgAccountManager. They have probably been lost if
        // the user has used an older version of Thunderbird on a
        // profile with IM accounts. See bug 736035.
        let accountsById = {};
        for (let account of fixIterator(Services.accounts.getAccounts()))
          accountsById[account.numericId] = account;
        let mgr = MailServices.accounts;
        for (let account of fixIterator(mgr.accounts, Components.interfaces.nsIMsgAccount)) {
          let incomingServer = account.incomingServer;
          if (!incomingServer || incomingServer.type != "im")
            continue;
          delete accountsById[incomingServer.wrappedJSObject.imAccount.numericId];
        }
        // Let's recreate each of them...
        for (let id in accountsById) {
          let account = accountsById[id];
          let inServer = mgr.createIncomingServer(account.name,
                                                  account.protocol.id, // hostname
                                                  "im");
          inServer.wrappedJSObject.imAccount = account;
          let acc = mgr.createAccount();
          // Avoid new folder notifications.
          inServer.valid = false;
          acc.incomingServer = inServer;
          inServer.valid = true;
          mgr.notifyServerLoaded(inServer);
        }

        Services.tags.getTags().forEach(function (aTag) {
          aTag.getContacts().forEach(function(aContact) {
            let name = aContact.preferredBuddy.normalizedName;
            allContacts[name] = aContact;
          });
        });

        ChatCore.initialized = true;
        Services.obs.notifyObservers(null, "chat-core-initialized");
        ChatCore._initializing = false;
        return true;
      },
      onPromptAuthAvailable: function() { },
      onPromptCanceled: function() { }
    });
  },
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "browser-request") {
      Services.ww.openWindow(null,
                             "chrome://chat/content/browserRequest.xul",
                             null, "chrome", aSubject);
      return;
    }

    if (aTopic == "contact-signed-on") {
      onlineContacts[aSubject.preferredBuddy.normalizedName] = aSubject;
      return;
    }

    if (aTopic == "contact-signed-off") {
      delete onlineContacts[aSubject.preferredBuddy.normalizedName];
      return;
    }

    if (aTopic == "contact-added") {
      allContacts[aSubject.preferredBuddy.normalizedName] = aSubject;
      return;
    }

    if (aTopic == "contact-removed") {
      delete allContacts[aSubject.preferredBuddy.normalizedName];
      return;
    }
  }
};
