/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

Components.utils.import("resource://gre/modules/Services.jsm");
let ircCTCP = {};
Services.scriptloader.loadSubScript("resource:///modules/ircCTCP.jsm", ircCTCP);

const input = [
  "ACTION",
  "ACTION test",
  "ACTION \x5Ctest",
  "ACTION te\x5Cst",
  "ACTION test\x5C",
  "ACTION \x5C\x5Ctest",
  "ACTION te\x5C\x5Cst",
  "ACTION test\x5C\x5C",
  "ACTION \x5C\x5C\x5Ctest",
  "ACTION te\x5C\x5C\x5Cst",
  "ACTION test\x5C\x5C\x5C",
  "ACTION \x5Catest",
  "ACTION te\x5Cast",
  "ACTION test\x5Ca",
  "ACTION \x5C\x5C\x5Catest",
  "ACTION \x5C\x5Catest"
];

const expectedOutputCommand = "ACTION";

const expectedOutputParam = [
  "", 
  "test",
  "test",
  "test",
  "test\x5C",
  "\x5C\x5Ctest",
  "te\x5C\x5Cst",
  "test\x5C\x5C",
  "\x5C\x5Ctest",
  "te\x5C\x5Cst",
  "test\x5C\x5C\x5C",
  "\x01test",
  "te\x01st",
  "test\x01",
  "\x5C\x5C\x01test",
  "\x5C\x5Catest"
];

function run_test() {
  let output = input.map(function(aStr) ircCTCP.CTCPMessage({}, aStr));
  for (let i = 0; i < output.length; ++i) {
    do_check_eq(expectedOutputParam[i], output[i].ctcp.param);
    do_check_eq(expectedOutputCommand, output[i].ctcp.command);
  }
}