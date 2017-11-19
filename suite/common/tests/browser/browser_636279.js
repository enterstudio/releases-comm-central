/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const TAB_STATE_NEEDS_RESTORE = 1;
const TAB_STATE_RESTORING = 2;

var stateBackup = ss.getBrowserState();

var statePinned = {windows:[{tabs:[
  {entries:[{url:"http://example.com#1"}], pinned: true}
]}]};

var state = {windows:[{tabs:[
  {entries:[{url:"http://example.com#1"}]},
  {entries:[{url:"http://example.com#2"}]},
  {entries:[{url:"http://example.com#3"}]},
  {entries:[{url:"http://example.com#4"}]},
]}]};

function test() {
  waitForExplicitFinish();

  registerCleanupFunction(function () {
    TabsProgressListener.uninit();
    ss.setBrowserState(stateBackup);
  });


  TabsProgressListener.init();

  window.addEventListener("SSWindowStateReady", function onReady() {
    window.removeEventListener("SSWindowStateReady", onReady);

    let firstProgress = true;

    TabsProgressListener.setCallback(function (needsRestore, isRestoring) {
      if (firstProgress) {
        firstProgress = false;
        is(isRestoring, 3, "restoring 3 tabs concurrently");
      } else {
        ok(isRestoring <= 3, "restoring max. 2 tabs concurrently");
      }

      if (0 == needsRestore) {
        TabsProgressListener.unsetCallback();
        waitForFocus(finish);
      }
    });

    ss.setBrowserState(JSON.stringify(state));
  });

  ss.setBrowserState(JSON.stringify(statePinned));
}

function countTabs() {
  let needsRestore = 0, isRestoring = 0;
  let windowsEnum = Services.wm.getEnumerator("navigator:browser");

  while (windowsEnum.hasMoreElements()) {
    let window = windowsEnum.getNext();
    if (window.closed)
      continue;

    for (let i = 0; i < window.getBrowser().tabs.length; i++) {
      let browser = window.getBrowser().tabs[i].linkedBrowser;
      if (browser.__SS_restoreState == TAB_STATE_RESTORING)
        isRestoring++;
      else if (browser.__SS_restoreState == TAB_STATE_NEEDS_RESTORE)
        needsRestore++;
    }
  }

  return [needsRestore, isRestoring];
}

var TabsProgressListener = {
  init: function () {
    getBrowser().addTabsProgressListener(this);
  },

  uninit: function () {
    this.unsetCallback();
    getBrowser().removeTabsProgressListener(this);
 },

  setCallback: function (callback) {
    this.callback = callback;
  },

  unsetCallback: function () {
    delete this.callback;
  },

  onStateChange: function (aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
    if (this.callback && aBrowser.__SS_restoreState == TAB_STATE_RESTORING &&
        aStateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK &&
        aStateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW)
      this.callback.apply(null, countTabs());
  }
}
