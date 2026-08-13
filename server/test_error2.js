function testFunction() {
  let er;
  if (false)
    er = args[0];
  throw er;
}

try {
  testFunction();
} catch (e) {
  console.log("Caught error:", e);
  throw new Error(`Failed to start server. Is port 3005 in use?\n      at emitError (node:events:51:13)`);
}