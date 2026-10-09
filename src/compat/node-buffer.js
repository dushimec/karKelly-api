import buffer, { Buffer } from "node:buffer";

if (typeof buffer.SlowBuffer === "undefined") {
  Object.defineProperty(buffer, "SlowBuffer", {
    configurable: true,
    value: Buffer,
  });
}
