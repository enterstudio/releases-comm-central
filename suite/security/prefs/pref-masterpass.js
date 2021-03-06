/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gInternalToken;

function Startup() {
  var tokendb = Components.classes["@mozilla.org/security/pk11tokendb;1"]
                          .getService(Components.interfaces.nsIPK11TokenDB);
  gInternalToken = tokendb.getInternalKeyToken();
}

function ChangePW()
{
  var p = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                    .createInstance(Components.interfaces.nsIDialogParamBlock);
  p.SetString(1, "");
  window.openDialog("chrome://pippki/content/changepassword.xul", "",
                    "chrome,centerscreen,modal", p);
}

function ResetPW()
{
  var p = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                    .createInstance(Components.interfaces.nsIDialogParamBlock);
  p.SetString(1, gInternalToken.tokenName);
  window.openDialog("chrome://pippki/content/resetpassword.xul", "",
                    "chrome,centerscreen,modal", p);
}
