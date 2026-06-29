<h1 align="center">gcstats</h1>
<p align="center">Exposes stats about V8 GC after it has been executed.</p>

[![Build Status](https://travis-ci.org/bripkens/node-gcstats.svg?branch=master)](https://travis-ci.org/bripkens/node-gcstats)

## Usage

Create a new instance of the module and subscribe to `stats`-events from that:

```javascript
var gcStats = require('gcstats.js');

gcStats.on('stats', function(stats) {
  console.log('GC happened', stats);
});
```

This will print blobs like this whenever a GC happens:

```
GC happened { start: 635817864674795,
  end: 635817865774643,
  gctype: 1,
  before:
   { totalHeapSize: 277510912,
     totalHeapExecutableSize: 5242880,
     usedHeapSize: 273621856,
     heapSizeLimit: 1535115264,
     totalPhysicalSize: 277510912 },
  after:
   { totalHeapSize: 277510912,
     totalHeapExecutableSize: 5242880,
     usedHeapSize: 273533760,
     heapSizeLimit: 1535115264,
     totalPhysicalSize: 277510912 } }
```

## Property insights
 * totalHeapSize: Number of bytes V8 has allocated for the heap. This can grow if usedHeap needs more.
 * usedHeapSize: Number of bytes in use by application data
 * total HeapExecutableSize: Number of bytes for compiled bytecode and JITed code
 * heapSizeLimit: The absolute limit the heap cannot exceed
 * totalPhysicalSize: Commited size (node 0.11+)
 * pause: Nanoseconds from start to end of GC using hrtime()

gctype can have the following values:
 * 1: Scavenge (minor GC)
 * 2: Mark/Sweep/Compact (major GC)
 * 3: Both 1 and 2

## Installation

```
npm install --save gcstats.js
```

## Node version compatibility
node-gcstats depends on C++ extensions which are compiled when the *gc-stats* module is installed. Compatibility information can be inspected via the [Travis-CI build jobs](https://travis-ci.org/dainis/node-gcstats/) and the [compatibility file](https://github.com/bripkens/node-gcstats/blob/develop/compatibility.md).

## Credits
`node-gcstats` was written by @dainis and later adopted by @bripkens.
